"""Interaction processor service module."""

import concurrent.futures
import logging
import os
from datetime import datetime
from datetime import timedelta
from datetime import timezone

import requests
from sqlalchemy import case
from sqlalchemy import select

from interactions_update.clients.notify_api import NotifyApiClient
from interactions_update.config.retry import RetryPolicy
from interactions_update.database import get_session
from interactions_update.handlers.interaction_status import InteractionStatusHandler
from interactions_update.handlers.notify_references import NotifyReferenceHandler
from interactions_update.services.auth import AuthService
from strr_api.enums.enum import InteractionStatus
from strr_api.models import CustomerInteraction
from strr_api.services.auth_service import AuthService as StrRAuthService

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

    def process_interaction(
        self, interaction_id: str, notify_url: str, headers: dict
    ) -> InteractionStatus | None:
        """Worker function to fetch status for a single interaction.

        Fetches the interaction in a new session to avoid thread-safety issues
        with ORM objects. Updates the interaction with delivery status and
        metadata from Notify API responses.

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

            notify_references = self.reference_handler.extract_from_interaction(
                interaction
            )
            if not notify_references:
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

            existing_meta_data = (
                interaction.meta_data.copy()
                if isinstance(interaction.meta_data, dict)
                else {}
            )
            recipient_statuses = {}
            mapped_statuses = []
            primary_payload = None

            for notify_reference in notify_references:
                notify_request = f"{notify_url}/notify/{notify_reference}"
                try:
                    resp = self.notify_api_client.call(
                        notify_request,
                        headers,
                        interaction_id,
                        notify_reference,
                    )
                except requests.exceptions.Timeout:
                    logger.error(
                        "strr.interactions.notify_request_timeout_exhausted interaction_id=%s notify_reference=%s timeout_seconds=%s retry_attempts=%s",
                        interaction_id,
                        notify_reference,
                        self.notify_api_client.timeout,
                        self.retry_policy.max_attempts,
                    )
                    continue
                except requests.exceptions.ConnectionError as exc:
                    logger.error(
                        "strr.interactions.notify_request_connection_error_exhausted interaction_id=%s notify_reference=%s error=%s retry_attempts=%s",
                        interaction_id,
                        notify_reference,
                        exc,
                        self.retry_policy.max_attempts,
                    )
                    continue
                except requests.exceptions.RequestException as exc:
                    logger.error(
                        "strr.interactions.notify_request_error_exhausted interaction_id=%s notify_reference=%s error=%s retry_attempts=%s",
                        interaction_id,
                        notify_reference,
                        exc,
                        self.retry_policy.max_attempts,
                    )
                    continue

                if resp.status_code != 200:
                    continue

                data = resp.json()
                normalized_status = self.status_handler.normalize_notify_status(data)
                mapped_status = self.status_handler.map_to_interaction_status(
                    normalized_status
                )
                if mapped_status:
                    mapped_statuses.append(mapped_status)

                recipient_statuses[notify_reference] = (
                    self.status_handler.build_recipient_metadata(
                        notify_reference,
                        data,
                        normalized_status,
                    )
                )

                if notify_reference == interaction.notify_reference:
                    primary_payload = data

            if not recipient_statuses:
                return None

            existing_meta_data["notify_references"] = ",".join(notify_references)
            existing_meta_data["notify_delivery"] = {
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "recipient_statuses": recipient_statuses,
            }

            if primary_payload:
                existing_meta_data["notify_response"] = primary_payload
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

            first_provider_reference = next(
                (
                    recipient_statuses[ref].get("provider_reference")
                    for ref in notify_references
                    if recipient_statuses.get(ref, {}).get("provider_reference")
                ),
                None,
            )

            new_status = None
            if InteractionStatus.FAILED in mapped_statuses:
                new_status = InteractionStatus.FAILED
            elif mapped_statuses and len(mapped_statuses) == len(notify_references):
                if all(
                    status == InteractionStatus.DELIVERED
                    for status in mapped_statuses
                ):
                    new_status = InteractionStatus.DELIVERED

            did_change = False
            if new_status and new_status != interaction.status:
                interaction.status = new_status
                did_change = True
            if (
                first_provider_reference
                and first_provider_reference != interaction.provider_reference
            ):
                interaction.provider_reference = first_provider_reference
                did_change = True
            if existing_meta_data != interaction.meta_data:
                interaction.meta_data = existing_meta_data
                did_change = True

            if did_change:
                session.commit()
                logger.info(
                    "strr.interactions.updated interaction_id=%s new_status=%s provider_reference=%s",
                    interaction_id,
                    new_status.value if new_status else None,
                    first_provider_reference,
                )
                return new_status
            logger.debug(
                "strr.interactions.no_change interaction_id=%s",
                interaction_id,
            )
            return None
        except Exception as exc:
            logger.exception(
                "strr.interactions.fetch_and_update_error interaction_id=%s error=%s",
                interaction_id,
                exc,
            )
            return None
        finally:
            session.close()

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
                "strr.interactions.sent_fetched sent_count=%s stale_sent_hours=%s",
                len(sent_interactions),
                stale_sent_hours,
            )
            interaction_ids = []
            missing_reference_count = 0
            for row in sent_interactions:
                references = self.reference_handler.extract_from_parts(
                    row.notify_reference,
                    row.meta_data,
                )
                if references:
                    interaction_ids.append(row.id)
                else:
                    missing_reference_count += 1

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

            token = StrRAuthService.get_service_client_token(
                **AuthService.get_config()
            )
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            }

            results = []
            # If max_workers is 1, run sequentially used in benchmarking comparison
            if self.max_workers == 1:
                for i_id in interaction_ids:
                    results.append(
                        self.process_interaction(i_id, notify_url, headers)
                    )
            else:
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
