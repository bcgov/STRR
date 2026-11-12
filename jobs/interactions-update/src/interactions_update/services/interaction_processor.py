"""Interaction processor service module."""

import concurrent.futures
import logging
import os
from datetime import datetime
from datetime import timedelta
from datetime import timezone
from typing import Any

import requests
from sqlalchemy import case
from sqlalchemy import select
from sqlalchemy import update

from interactions_update.clients.notify_api import NotifyApiClient
from interactions_update.config.retry import RetryPolicy
from interactions_update.database import get_session
from interactions_update.handlers.interaction_status import InteractionStatusHandler
from interactions_update.handlers.notify_references import NotifyReferenceHandler
from interactions_update.services.auth import AuthService
from strr_api.enums.enum import DeliveryStatus
from strr_api.enums.enum import FailureType
from strr_api.enums.enum import InteractionStatus
from strr_api.enums.enum import RecipientRole
from strr_api.models import CustomerInteraction
from strr_api.models import InteractionRecipient
from strr_api.services.auth_service import AuthService as StrRAuthService
from strr_api.services.delivery_status_adapter import DeliveryStatusAdapter

logger = logging.getLogger(__name__)


class InteractionProcessor:
    """Main orchestration service for processing interactions.

    Orchestrates the complete workflow of fetching interaction statuses from
    Notify API and updating the database with delivery outcomes. Handles
    concurrent processing with configurable thread pool and retry strategies.
    """

    def __init__(
        self,
        retry_policy: RetryPolicy | None = None,
        max_workers: int | None = None,
    ):
        """Initialize interaction processor.

        Args:
            retry_policy: RetryPolicy instance, created from env if not provided
            max_workers: Thread pool size, read from MAX_WORKERS env or defaults to 10
        """
        self.retry_policy = retry_policy or RetryPolicy.from_env()
        self.max_workers = max_workers or int(os.getenv("MAX_WORKERS", "10"))
        self.notify_api_client = NotifyApiClient(
            retry_policy=self.retry_policy,
            timeout=int(os.getenv("NOTIFY_API_TIMEOUT", "10")),
        )
        self.status_handler = InteractionStatusHandler
        self.reference_handler = NotifyReferenceHandler

    def _fetch_notify_payload(
        self,
        interaction_id: str,
        notify_reference: str,
        notify_url: str,
        headers: dict,
    ) -> dict | None:
        """Call Notify API for one reference and return parsed payload on success."""
        notify_request = f"{notify_url}/notify/{notify_reference}"
        try:
            resp = self.notify_api_client.call(
                notify_request,
                headers,
                interaction_id,
                notify_reference,
            )
        except requests.exceptions.Timeout as exc:
            logger.exception(
                "strr.interactions.notify_request_timeout_exhausted interaction_id=%s notify_reference=%s timeout_seconds=%s retry_attempts=%s error=%s",
                interaction_id,
                notify_reference,
                self.notify_api_client.timeout,
                self.retry_policy.max_attempts,
                exc,
            )
            return None
        except requests.exceptions.ConnectionError as exc:
            logger.exception(
                "strr.interactions.notify_request_connection_error_exhausted interaction_id=%s notify_reference=%s error=%s retry_attempts=%s",
                interaction_id,
                notify_reference,
                exc,
                self.retry_policy.max_attempts,
            )
            return None
        except requests.exceptions.RequestException as exc:
            logger.exception(
                "strr.interactions.notify_request_error_exhausted interaction_id=%s notify_reference=%s error=%s retry_attempts=%s",
                interaction_id,
                notify_reference,
                exc,
                self.retry_policy.max_attempts,
            )
            return None

        if resp.status_code != 200:
            return None
        return resp.json()

    def _merge_primary_notify_metadata(
        self, existing_meta_data: dict, primary_payload: dict | None
    ) -> None:
        """Merge transport and GC Notify fields for the primary notify payload."""
        if not primary_payload:
            return

        existing_notify_response = (
            existing_meta_data.get("notify_response")
            if isinstance(existing_meta_data.get("notify_response"), dict)
            else {}
        )
        merged_notify_response = {**existing_notify_response, **primary_payload}
        if "failed_recipients" in existing_notify_response:
            merged_notify_response["failed_recipients"] = existing_notify_response[
                "failed_recipients"
            ]
        if "ids" in existing_notify_response:
            merged_notify_response["ids"] = existing_notify_response["ids"]
        if "recipients" in existing_notify_response:
            merged_notify_response["recipients"] = existing_notify_response[
                "recipients"
            ]
        existing_meta_data["notify_response"] = merged_notify_response
        transport_status = self.status_handler.normalize_transport_status(
            primary_payload
        )
        if transport_status:
            existing_meta_data["notifyStatus"] = transport_status
        else:
            existing_meta_data.pop("notifyStatus", None)

        gc_notify_status = self.status_handler.normalize_gc_notify_status(
            primary_payload
        )
        if gc_notify_status:
            existing_meta_data["gc_notify_status"] = gc_notify_status
        else:
            existing_meta_data.pop("gc_notify_status", None)

    @staticmethod
    def _parse_iso_datetime(value: Any) -> datetime | None:
        """Parse an ISO-8601 timestamp string into a timezone-aware datetime."""
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        if not isinstance(value, str) or not value.strip():
            return None
        cleaned = value.strip()
        if cleaned.endswith("Z"):
            cleaned = cleaned[:-1] + "+00:00"
        try:
            dt = datetime.fromisoformat(cleaned)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            return None

    @classmethod
    def _atomic_upsert_recipient_row(
        cls,
        session,
        interaction_id: int,
        notify_reference: str,
        recipient_meta: dict,
        raw_payload: dict | None = None,
    ) -> bool:
        """Atomically update or insert an InteractionRecipient row for a single recipient."""
        delivery_status_str = recipient_meta.get(
            "delivery_status"
        ) or recipient_meta.get("status")
        delivery_status = DeliveryStatusAdapter.map_provider_status(
            delivery_status_str,
            error_detail=recipient_meta.get("failure_reason"),
        )
        email_address = recipient_meta.get("email_address")
        provider_reference = recipient_meta.get("provider_reference")
        failure_type = recipient_meta.get("failure_type")
        failure_reason = recipient_meta.get("failure_reason")
        request_date = cls._parse_iso_datetime(recipient_meta.get("request_date"))
        sent_date = cls._parse_iso_datetime(recipient_meta.get("sent_date"))
        now_utc = datetime.now(timezone.utc)

        payload_to_store = {
            **(raw_payload or {}),
            "provider_status": recipient_meta.get("status"),
            "request_date_str": recipient_meta.get("request_date"),
            "sent_date_str": recipient_meta.get("sent_date"),
        }

        update_values = {
            "status": delivery_status,
            "failure_type": failure_type,
            "failure_reason": failure_reason,
            "provider_reference": provider_reference,
            "updated_at": now_utc,
            "raw_payload": payload_to_store,
        }
        if email_address:
            update_values["email_address"] = str(email_address).strip()
        if request_date:
            update_values["request_date"] = request_date
        if sent_date:
            update_values["sent_date"] = sent_date

        # 1. Try atomic single-row UPDATE by notify_reference
        stmt = (
            update(InteractionRecipient)
            .where(
                InteractionRecipient.interaction_id == interaction_id,
                InteractionRecipient.notify_reference == str(notify_reference),
            )
            .values(**update_values)
        )
        result = session.execute(stmt)
        if result.rowcount and result.rowcount > 0:
            return True

        # 2. If not matched by notify_reference, try atomic UPDATE by interaction_id + email_address
        if email_address:
            stmt_by_email = (
                update(InteractionRecipient)
                .where(
                    InteractionRecipient.interaction_id == interaction_id,
                    InteractionRecipient.email_address == str(email_address).strip(),
                    InteractionRecipient.notify_reference.is_(None),
                )
                .values(notify_reference=str(notify_reference), **update_values)
            )
            res_email = session.execute(stmt_by_email)
            if res_email.rowcount and res_email.rowcount > 0:
                return True

        # 3. If no row existed yet (e.g., pre-backfill interaction), insert normalized row
        if email_address:
            recipient = InteractionRecipient(
                interaction_id=interaction_id,
                recipient_role=RecipientRole.HOST.value,
                email_address=str(email_address).strip(),
                status=delivery_status,
                failure_type=failure_type,
                failure_reason=failure_reason,
                notify_reference=str(notify_reference),
                provider_reference=provider_reference,
                request_date=request_date,
                sent_date=sent_date,
                updated_at=now_utc,
                raw_payload=payload_to_store,
            )
            session.add(recipient)
            return True

        return False

    SENT_TIMEOUT_HOURS: int = 72

    @classmethod
    def _strip_volatile_metadata_keys(cls, data: Any) -> Any:
        """Recursively strip volatile keys like 'updated_at' for reliable dirty checking."""
        if isinstance(data, dict):
            return {
                k: cls._strip_volatile_metadata_keys(v)
                for k, v in data.items()
                if k != "updated_at"
            }
        if isinstance(data, list):
            return [cls._strip_volatile_metadata_keys(item) for item in data]
        return data

    @classmethod
    def is_metadata_changed(
        cls, current_meta: dict | None, updated_meta: dict | None
    ) -> bool:
        """Compare two metadata dictionaries ignoring volatile keys like updated_at."""
        return cls._strip_volatile_metadata_keys(
            current_meta or {}
        ) != cls._strip_volatile_metadata_keys(updated_meta or {})

    @classmethod
    def _resolve_new_status(
        cls,
        mapped_statuses: list[InteractionStatus],
        reference_count: int,
        has_failed_recipients: bool = False,
        is_timed_out: bool = False,
    ) -> InteractionStatus | None:
        """Derive final interaction status from collected per-reference statuses."""
        if InteractionStatus.FAILED in mapped_statuses:
            return InteractionStatus.FAILED
        if mapped_statuses and len(mapped_statuses) == reference_count:
            if all(status == InteractionStatus.DELIVERED for status in mapped_statuses):
                return (
                    InteractionStatus.FAILED
                    if has_failed_recipients
                    else InteractionStatus.DELIVERED
                )
        if is_timed_out:
            return InteractionStatus.FAILED
        return None

    @classmethod
    def _apply_interaction_updates(
        cls,
        interaction: CustomerInteraction,
        new_status: InteractionStatus | None,
        provider_reference: str | None,
        existing_meta_data: dict,
    ) -> bool:
        """Apply changed values to interaction and report whether anything changed."""
        did_change = False
        if new_status and new_status != interaction.status:
            interaction.status = new_status
            did_change = True
        if provider_reference and provider_reference != interaction.provider_reference:
            interaction.provider_reference = provider_reference
            did_change = True
        if cls.is_metadata_changed(interaction.meta_data, existing_meta_data):
            interaction.meta_data = existing_meta_data
            did_change = True
        return did_change

    def _collect_processable_ids(
        self,
        sent_interactions: list,
        timeout_threshold: datetime | None = None,
        stale_threshold: datetime | None = None,
    ) -> tuple[list[str], int]:
        """Split SENT rows into processable and missing-reference counts, skipping stale rows."""
        interaction_ids = []
        missing_reference_count = 0
        for row in sent_interactions:
            created_at = row.created_at
            if created_at and not created_at.tzinfo:
                created_at = created_at.replace(tzinfo=timezone.utc)
            if stale_threshold and created_at and created_at < stale_threshold:
                continue

            references = self.reference_handler.extract_from_parts(
                row.notify_reference,
                row.meta_data,
            )
            is_timed_out = bool(
                timeout_threshold and created_at and created_at <= timeout_threshold
            )
            if references or is_timed_out:
                interaction_ids.append(row.id)
            else:
                missing_reference_count += 1
        return interaction_ids, missing_reference_count

    def _process_all_interactions(
        self,
        interaction_ids: list[str],
        notify_url: str,
        headers: dict,
    ) -> list[InteractionStatus | None]:
        """Process interactions sequentially or via thread pool based on config."""
        results = []
        if self.max_workers == 1:
            for i_id in interaction_ids:
                results.append(self.process_interaction(i_id, notify_url, headers))
            return results

        with concurrent.futures.ThreadPoolExecutor(
            max_workers=self.max_workers
        ) as executor:
            futures = {
                executor.submit(
                    self.process_interaction, i_id, notify_url, headers
                ): i_id
                for i_id in interaction_ids
            }
            for future in concurrent.futures.as_completed(futures):
                i_id = futures[future]
                try:
                    results.append(future.result())
                except Exception as exc:
                    logger.exception(
                        "strr.interactions.worker_error interaction_id=%s error=%s",
                        i_id,
                        exc,
                    )
                    results.append(None)
        return results

    def _check_stale_or_timeout(
        self, interaction: CustomerInteraction
    ) -> tuple[bool, bool, int]:
        stale_sent_hours = int(os.getenv("STALE_SENT_HOURS", "24"))
        created_at = interaction.created_at
        if created_at and not created_at.tzinfo:
            created_at = created_at.replace(tzinfo=timezone.utc)

        is_stale = bool(
            created_at
            and (datetime.now(timezone.utc) - created_at)
            >= timedelta(hours=stale_sent_hours)
        )
        sent_timeout_hours = int(
            os.getenv("SENT_TIMEOUT_HOURS", str(self.SENT_TIMEOUT_HOURS))
        )
        is_timed_out = bool(
            created_at
            and (datetime.now(timezone.utc) - created_at)
            >= timedelta(hours=sent_timeout_hours)
        )
        return is_stale, is_timed_out, sent_timeout_hours

    def _handle_timeout_transition(
        self, session, interaction, meta_data, reason: str, log_event: str
    ) -> InteractionStatus:
        interaction.status = InteractionStatus.FAILED
        meta_data["timed_out"] = True
        meta_data["timeout_reason"] = reason
        interaction.meta_data = meta_data
        session.commit()
        logger.warning(
            f"strr.interactions.{log_event} interaction_id=%s",
            interaction.id,
        )
        return InteractionStatus.FAILED

    def _poll_recipient_references(
        self, session, interaction, notify_references, notify_url, headers
    ) -> tuple[dict, list, Any, bool]:
        recipient_statuses = {}
        mapped_statuses = []
        primary_payload = None
        recipient_rows_updated = False

        for notify_reference in notify_references:
            data = self._fetch_notify_payload(
                interaction.id,
                notify_reference,
                notify_url,
                headers,
            )
            if not data:
                continue
            normalized_status = self.status_handler.normalize_notify_status(data)
            mapped_status = self.status_handler.map_to_interaction_status(
                normalized_status
            )
            if mapped_status:
                mapped_statuses.append(mapped_status)

            recipient_meta = self.status_handler.build_recipient_metadata(
                notify_reference,
                data,
                normalized_status,
            )
            recipient_statuses[notify_reference] = recipient_meta

            if self._atomic_upsert_recipient_row(
                session=session,
                interaction_id=interaction.id,
                notify_reference=notify_reference,
                recipient_meta=recipient_meta,
                raw_payload=data,
            ):
                recipient_rows_updated = True

            if notify_reference == interaction.notify_reference:
                primary_payload = data

        return (
            recipient_statuses,
            mapped_statuses,
            primary_payload,
            recipient_rows_updated,
        )

    def _timeout_pending_recipients(
        self, session, interaction_id: int, reason: str
    ) -> bool:
        stmt_timeout = (
            update(InteractionRecipient)
            .where(
                InteractionRecipient.interaction_id == interaction_id,
                InteractionRecipient.status.in_(
                    [
                        DeliveryStatus.PENDING,
                        DeliveryStatus.QUEUED,
                        DeliveryStatus.SENDING,
                        DeliveryStatus.TEMPORARY_FAILURE,
                    ]
                ),
            )
            .values(
                status=DeliveryStatus.TECHNICAL_FAILURE,
                failure_type=FailureType.GATEWAY_ERROR.value,
                failure_reason=reason,
                updated_at=datetime.now(timezone.utc),
            )
        )
        res_to = session.execute(stmt_timeout)
        return bool(res_to.rowcount and res_to.rowcount > 0)

    def _assemble_updated_delivery_metadata(
        self,
        current_delivery: dict,
        recipient_statuses: dict,
        is_timed_out: bool,
        new_status: InteractionStatus | None,
        timeout_reason: str,
    ) -> dict:
        new_delivery = {"recipient_statuses": recipient_statuses}
        if is_timed_out and new_status == InteractionStatus.FAILED:
            new_delivery["timed_out"] = True
            new_delivery["timeout_reason"] = timeout_reason

        delivery_changed = self._strip_volatile_metadata_keys(
            current_delivery
        ) != self._strip_volatile_metadata_keys(new_delivery)

        if delivery_changed or not current_delivery.get("updated_at"):
            new_delivery["updated_at"] = datetime.now(timezone.utc).isoformat()
        else:
            new_delivery["updated_at"] = current_delivery.get("updated_at")

        return new_delivery

    def process_interaction(
        self, interaction_id: str, notify_url: str, headers: dict
    ) -> InteractionStatus | None:
        """Worker function to fetch status for a single interaction.

        Fetches the interaction in a new session to avoid thread-safety issues
        with ORM objects. Updates interaction_recipients rows via atomic single-row
        SQL updates and updates the parent interaction status.

        Args:
            interaction_id: ID of interaction to process
            notify_url: Base URL for Notify API
            headers: HTTP headers including auth token

        Returns:
            InteractionStatus: DELIVERED or FAILED if updated, None if no change
        """
        session_gen = get_session()
        session = next(session_gen)
        try:
            interaction = session.get(CustomerInteraction, interaction_id)
            if not interaction:
                logger.warning(
                    "strr.interactions.interaction_not_found interaction_id=%s",
                    interaction_id,
                )
                return None

            is_stale, is_timed_out, sent_timeout_hours = self._check_stale_or_timeout(
                interaction
            )
            if is_stale:
                logger.warning(
                    "strr.interactions.stale_sent_skipped interaction_id=%s created_at=%s stale_sent_hours=%s",
                    interaction_id,
                    (
                        interaction.created_at.isoformat()
                        if interaction.created_at
                        else None
                    ),
                    os.getenv("STALE_SENT_HOURS", "24"),
                )
                return None

            existing_meta_data = (
                interaction.meta_data.copy()
                if isinstance(interaction.meta_data, dict)
                else {}
            )

            notify_references = self.reference_handler.extract_from_interaction(
                interaction
            )
            timeout_msg = (
                f"Delivery confirmation timed out after {sent_timeout_hours} hours"
            )

            if not notify_references:
                if is_timed_out:
                    return self._handle_timeout_transition(
                        session,
                        interaction,
                        existing_meta_data,
                        f"Missing notify references and timed out after {sent_timeout_hours} hours",
                        "missing_reference_timed_out",
                    )
                logger.debug(
                    "strr.interactions.no_references_skipped interaction_id=%s",
                    interaction_id,
                )
                return None

            logger.debug(
                "strr.interactions.processing interaction_id=%s reference_count=%s",
                interaction_id,
                len(notify_references),
            )

            (
                recipient_statuses,
                mapped_statuses,
                primary_payload,
                recipient_rows_updated,
            ) = self._poll_recipient_references(
                session, interaction, notify_references, notify_url, headers
            )

            if not recipient_statuses:
                if is_timed_out:
                    return self._handle_timeout_transition(
                        session,
                        interaction,
                        existing_meta_data,
                        timeout_msg,
                        "sent_timeout_transition",
                    )
                return None

            return self._apply_processed_results(
                session=session,
                interaction=interaction,
                notify_references=notify_references,
                recipient_statuses=recipient_statuses,
                mapped_statuses=mapped_statuses,
                primary_payload=primary_payload,
                is_timed_out=is_timed_out,
                timeout_msg=timeout_msg,
                recipient_rows_updated=recipient_rows_updated,
                existing_meta_data=existing_meta_data,
            )
        except Exception as exc:
            logger.exception(
                "strr.interactions.fetch_and_update_error interaction_id=%s error=%s",
                interaction_id,
                exc,
            )
            return None
        finally:
            session.close()

    def _apply_processed_results(
        self,
        session,
        interaction: CustomerInteraction,
        notify_references: list[str],
        recipient_statuses: dict,
        mapped_statuses: list[InteractionStatus],
        primary_payload: dict,
        is_timed_out: bool,
        timeout_msg: str,
        recipient_rows_updated: bool,
        existing_meta_data: dict,
    ) -> InteractionStatus | None:
        """Calculate new status and commit updates for interaction and recipients."""
        current_delivery = (
            interaction.meta_data.get("notify_delivery")
            if isinstance(interaction.meta_data, dict)
            and isinstance(interaction.meta_data.get("notify_delivery"), dict)
            else {}
        )

        has_failed_recipients = bool(
            existing_meta_data.get("notify_response", {}).get("failed_recipients")
        )
        new_status = self._resolve_new_status(
            mapped_statuses,
            len(notify_references),
            has_failed_recipients=has_failed_recipients,
            is_timed_out=is_timed_out,
        )

        if (
            is_timed_out
            and new_status == InteractionStatus.FAILED
            and self._timeout_pending_recipients(session, interaction.id, timeout_msg)
        ):
            recipient_rows_updated = True

        new_delivery = self._assemble_updated_delivery_metadata(
            current_delivery,
            recipient_statuses,
            is_timed_out,
            new_status,
            timeout_msg,
        )

        existing_meta_data["notify_references"] = ",".join(notify_references)
        self._merge_primary_notify_metadata(existing_meta_data, primary_payload)
        existing_meta_data["notify_delivery"] = new_delivery

        first_provider_reference = next(
            (
                recipient_statuses[ref].get("provider_reference")
                for ref in notify_references
                if recipient_statuses.get(ref, {}).get("provider_reference")
            ),
            None,
        )

        did_change = self._apply_interaction_updates(
            interaction,
            new_status,
            first_provider_reference,
            existing_meta_data,
        )

        if did_change or recipient_rows_updated:
            session.commit()
            logger.info(
                "strr.interactions.updated interaction_id=%s new_status=%s provider_reference=%s",
                interaction.id,
                new_status.value if new_status else None,
                first_provider_reference,
            )
            return new_status
        logger.debug(
            "strr.interactions.no_change interaction_id=%s",
            interaction.id,
        )
        return None

    def run(self) -> None:
        """Execute the interaction processing job.

        Fetches all SENT interactions, updates their status from Notify API,
        and processes them concurrently based on configuration. Logs comprehensive
        metrics for observability and alerting.
        """
        job_start = __import__("time").monotonic()

        notify_url = os.getenv("NOTIFY_API_URL", "") + os.getenv(
            "NOTIFY_API_VERSION", ""
        )
        os.environ["NOTIFY_SVC_URL"] = notify_url

        logger.info(
            "strr.interactions.job_started max_workers=%s notify_timeout=%s",
            self.max_workers,
            self.notify_api_client.timeout,
        )

        session_gen = get_session()
        session = next(session_gen)

        try:
            sent_timeout_hours = int(
                os.getenv("SENT_TIMEOUT_HOURS", str(self.SENT_TIMEOUT_HOURS))
            )
            timeout_threshold = datetime.now(timezone.utc) - timedelta(
                hours=sent_timeout_hours
            )
            stale_sent_hours = int(os.getenv("STALE_SENT_HOURS", "24"))
            stale_threshold = datetime.now(timezone.utc) - timedelta(
                hours=stale_sent_hours
            )
            stmt = select(
                CustomerInteraction.id,
                CustomerInteraction.created_at,
                CustomerInteraction.notify_reference,
                CustomerInteraction.meta_data,
                case(
                    (
                        CustomerInteraction.created_at < stale_threshold,
                        True,
                    ),
                    else_=False,
                ).label("is_stale"),
            ).where(CustomerInteraction.status == InteractionStatus.SENT)
            sent_interactions = session.execute(stmt).all()
            logger.info(
                "strr.interactions.sent_fetched sent_count=%s stale_sent_hours=%s sent_timeout_hours=%s",
                len(sent_interactions),
                stale_sent_hours,
                sent_timeout_hours,
            )
            interaction_ids, missing_reference_count = self._collect_processable_ids(
                sent_interactions,
                timeout_threshold=timeout_threshold,
                stale_threshold=stale_threshold,
            )

            stale_interaction_ids = [
                row.id for row in sent_interactions if row.is_stale
            ]
            if stale_interaction_ids:
                logger.warning(
                    "strr.interactions.stale_sent_detected stale_sent_count=%s stale_sent_hours=%s interaction_ids=%s",
                    len(stale_interaction_ids),
                    stale_sent_hours,
                    stale_interaction_ids[:25],
                )

            if not interaction_ids:
                duration_ms = int((__import__("time").monotonic() - job_start) * 1000)
                logger.info(
                    "strr.interactions.update_completed sent_count=%s delivered_count=0 failed_count=0 stale_sent_count=%s missing_reference_count=%s retry_max_attempts=%s retry_backoff_min=%s retry_backoff_max=%s rate_limit_per_second=%s duration_ms=%s",
                    len(sent_interactions),
                    len(stale_interaction_ids),
                    missing_reference_count,
                    self.retry_policy.max_attempts,
                    self.retry_policy.backoff_min_seconds,
                    self.retry_policy.backoff_max_seconds,
                    self.retry_policy.rate_limit_per_second,
                    duration_ms,
                )
                return

            token = StrRAuthService.get_service_client_token(**AuthService.get_config())
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            }

            results = self._process_all_interactions(
                interaction_ids, notify_url, headers
            )

            failed_count = results.count(InteractionStatus.FAILED)
            delivered_count = results.count(InteractionStatus.DELIVERED)
            duration_ms = int((__import__("time").monotonic() - job_start) * 1000)
            if failed_count:
                logger.warning(
                    "strr.interactions.failed_detected interaction_status=FAILED failed_count=%s",
                    failed_count,
                )
            logger.info(
                "strr.interactions.update_completed sent_count=%s delivered_count=%s failed_count=%s stale_sent_count=%s missing_reference_count=%s retry_max_attempts=%s retry_backoff_min=%s retry_backoff_max=%s rate_limit_per_second=%s duration_ms=%s",
                len(sent_interactions),
                delivered_count,
                failed_count,
                len(stale_interaction_ids),
                missing_reference_count,
                self.retry_policy.max_attempts,
                self.retry_policy.backoff_min_seconds,
                self.retry_policy.backoff_max_seconds,
                self.retry_policy.rate_limit_per_second,
                duration_ms,
            )
        finally:
            session.close()
