import concurrent.futures
import logging
import os
import time
from datetime import datetime
from datetime import timedelta
from datetime import timezone

import requests
from dotenv import find_dotenv
from dotenv import load_dotenv
from sqlalchemy import case
from sqlalchemy import select

from interactions_update.database import get_session
from strr_api.enums.enum import InteractionStatus
from strr_api.models import CustomerInteraction
from strr_api.services.auth_service import AuthService

load_dotenv(find_dotenv())

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_FAILURE_STATUSES = {
    "FAILURE",
    "FAILED",
    "PERMANENT_FAILURE",
    "TEMPORARY_FAILURE",
    "TECHNICAL_FAILURE",
    "VIRUS_SCAN_FAILED",
}

_DELIVERED_STATUSES = {"DELIVERED", "SENT"}


def _to_reference_list(raw_value):
    """Normalize notify reference values from strings/lists into a deduplicated list."""
    if raw_value is None:
        return []
    if isinstance(raw_value, str):
        values = [v.strip() for v in raw_value.split(",") if v and v.strip()]
    elif isinstance(raw_value, (list, tuple, set)):
        values = [str(v).strip() for v in raw_value if str(v).strip()]
    else:
        values = [str(raw_value).strip()]

    deduped = []
    seen = set()
    for value in values:
        if value not in seen:
            seen.add(value)
            deduped.append(value)
    return deduped


def _extract_notify_references(interaction):
    """Extract all notify references from primary and metadata fields."""
    return _extract_notify_references_from_parts(
        interaction.notify_reference,
        interaction.meta_data,
    )


def _extract_notify_references_from_parts(notify_reference, meta_data):
    """Extract all notify references from primary and metadata fields."""
    references = []
    references.extend(_to_reference_list(notify_reference))

    metadata = meta_data if isinstance(meta_data, dict) else {}
    references.extend(_to_reference_list(metadata.get("notify_references")))
    notify_response = metadata.get("notify_response")
    if isinstance(notify_response, dict):
        references.extend(_to_reference_list(notify_response.get("ids")))

    deduped = []
    seen = set()
    for ref in references:
        if ref not in seen:
            seen.add(ref)
            deduped.append(ref)
    return deduped


def _normalize_notify_status(data):
    """Normalize status across notify-api and GC Notify response shapes."""
    raw_status = data.get("gc_notify_status") or data.get("notifyStatus")
    if raw_status is None:
        return None
    return str(raw_status).strip().upper().replace("-", "_")


def _normalize_transport_status(data):
    """Normalize the transport-level status field returned by notify-api."""
    raw_status = data.get("notifyStatus")
    if raw_status is None:
        return None
    return str(raw_status).strip().upper().replace("-", "_")


def _normalize_gc_notify_status(data):
    """Normalize the downstream GC Notify delivery status when available."""
    raw_status = data.get("gc_notify_status")
    if raw_status is None:
        return None
    return str(raw_status).strip().upper().replace("-", "_")


def _map_interaction_status(normalized_status):
    """Map Notify status values to interaction terminal statuses."""
    if normalized_status in _DELIVERED_STATUSES:
        return InteractionStatus.DELIVERED
    if normalized_status in _FAILURE_STATUSES:
        return InteractionStatus.FAILED
    return None


def _recipient_metadata(notify_reference, data, normalized_status):
    """Build per-recipient delivery metadata for reporting and audit."""
    status_description = data.get("status_description")
    provider_response = data.get("provider_response")
    failure_type = normalized_status if normalized_status in _FAILURE_STATUSES else None

    return {
        "notify_reference": notify_reference,
        "provider_reference": (
            str(data.get("id")) if data.get("id") is not None else None
        ),
        "status": normalized_status,
        "failure_type": failure_type,
        "failure_reason": provider_response or status_description,
        "email_address": data.get("recipients"),
        "sent_date": data.get("sentDate"),
        "request_date": data.get("requestDate"),
    }


def fetch_and_update(interaction_id, notify_url, headers, timeout):
    """Worker function to fetch status for a single interaction."""
    # We fetch the interaction in a local session or use IDs to avoid thread-safety issues with ORM objects
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

        notify_references = _extract_notify_references(interaction)
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
            logger.debug(
                "strr.interactions.notify_request interaction_id=%s notify_reference=%s url=%s",
                interaction_id,
                notify_reference,
                notify_request,
            )
            t0 = time.monotonic()
            try:
                resp = requests.get(notify_request, headers=headers, timeout=timeout)
            except requests.exceptions.Timeout:
                logger.error(
                    "strr.interactions.notify_request_timeout interaction_id=%s notify_reference=%s timeout_seconds=%s",
                    interaction_id,
                    notify_reference,
                    timeout,
                )
                continue
            except requests.exceptions.ConnectionError as exc:
                logger.error(
                    "strr.interactions.notify_request_connection_error interaction_id=%s notify_reference=%s error=%s",
                    interaction_id,
                    notify_reference,
                    exc,
                )
                continue
            except requests.exceptions.RequestException as exc:
                logger.error(
                    "strr.interactions.notify_request_error interaction_id=%s notify_reference=%s error=%s",
                    interaction_id,
                    notify_reference,
                    exc,
                )
                continue
            duration_ms = int((time.monotonic() - t0) * 1000)

            if resp.status_code != 200:
                logger.warning(
                    "strr.interactions.notify_status_fetch_failed interaction_id=%s notify_reference=%s status_code=%s duration_ms=%s",
                    interaction_id,
                    notify_reference,
                    resp.status_code,
                    duration_ms,
                )
                continue

            logger.debug(
                "strr.interactions.notify_request_success interaction_id=%s notify_reference=%s status_code=%s duration_ms=%s",
                interaction_id,
                notify_reference,
                resp.status_code,
                duration_ms,
            )

            data = resp.json()
            normalized_status = _normalize_notify_status(data)
            mapped_status = _map_interaction_status(normalized_status)
            if mapped_status:
                mapped_statuses.append(mapped_status)

            recipient_statuses[notify_reference] = _recipient_metadata(
                notify_reference,
                data,
                normalized_status,
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
            transport_status = _normalize_transport_status(primary_payload)
            if transport_status:
                existing_meta_data["notifyStatus"] = transport_status
            else:
                existing_meta_data.pop("notifyStatus", None)

            gc_notify_status = _normalize_gc_notify_status(primary_payload)
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
            if all(status == InteractionStatus.DELIVERED for status in mapped_statuses):
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


def _get_auth_config():
    client_id = os.getenv("STRR_SERVICE_ACCOUNT_CLIENT_ID")
    client_secret = os.getenv("STRR_SERVICE_ACCOUNT_SECRET")
    token_url = os.getenv("KEYCLOAK_AUTH_TOKEN_URL")
    timeout = int(os.getenv("AUTH_SVC_TIMEOUT", 20))

    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "token_url": token_url,
        "timeout": timeout,
    }


def run(max_workers=None):
    """Executes the update job. If max_workers=1, it runs sequentially."""
    job_start = time.monotonic()
    if max_workers is None:
        max_workers = int(os.getenv("MAX_WORKERS", "10"))

    notify_url = os.getenv("NOTIFY_API_URL", "") + os.getenv("NOTIFY_API_VERSION", "")
    os.environ["NOTIFY_SVC_URL"] = notify_url
    notify_timeout = int(os.getenv("NOTIFY_API_TIMEOUT", "10"))
    logger.info(
        "strr.interactions.job_started max_workers=%s notify_timeout=%s",
        max_workers,
        notify_timeout,
    )

    session_gen = get_session()
    session = next(session_gen)

    try:
        stale_sent_hours = int(os.getenv("STALE_SENT_HOURS", "24"))
        stale_threshold = datetime.now(timezone.utc) - timedelta(hours=stale_sent_hours)
        stmt = select(
            CustomerInteraction.id,
            CustomerInteraction.created_at,
            CustomerInteraction.notify_reference,
            CustomerInteraction.meta_data,
            case(
                (CustomerInteraction.created_at < stale_threshold, True), else_=False
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
            references = _extract_notify_references_from_parts(
                row.notify_reference,
                row.meta_data,
            )
            if references:
                interaction_ids.append(row.id)
            else:
                missing_reference_count += 1

        stale_interaction_ids = [row.id for row in sent_interactions if row.is_stale]
        if stale_interaction_ids:
            logger.warning(
                "strr.interactions.stale_sent_detected stale_sent_count=%s stale_sent_hours=%s interaction_ids=%s",
                len(stale_interaction_ids),
                stale_sent_hours,
                stale_interaction_ids[:25],
            )

        if not interaction_ids:
            duration_ms = int((time.monotonic() - job_start) * 1000)
            logger.info(
                "strr.interactions.update_completed sent_count=%s delivered_count=0 failed_count=0 stale_sent_count=%s missing_reference_count=%s duration_ms=%s",
                len(sent_interactions),
                len(stale_interaction_ids),
                missing_reference_count,
                duration_ms,
            )
            return

        token = AuthService.get_service_client_token(**_get_auth_config())
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        results = []
        # If max_workers is 1, run sequentially used in benchmarking comparison
        if max_workers == 1:
            for i_id in interaction_ids:
                results.append(
                    fetch_and_update(i_id, notify_url, headers, notify_timeout)
                )
        else:
            with concurrent.futures.ThreadPoolExecutor(
                max_workers=max_workers
            ) as executor:
                futures = {
                    executor.submit(
                        fetch_and_update, i_id, notify_url, headers, notify_timeout
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
        duration_ms = int((time.monotonic() - job_start) * 1000)
        if failed_count:
            logger.warning(
                "strr.interactions.failed_detected interaction_status=FAILED failed_count=%s",
                failed_count,
            )
        logger.info(
            "strr.interactions.update_completed sent_count=%s delivered_count=%s failed_count=%s stale_sent_count=%s missing_reference_count=%s duration_ms=%s",
            len(sent_interactions),
            delivered_count,
            failed_count,
            len(stale_interaction_ids),
            missing_reference_count,
            duration_ms,
        )
    finally:
        session.close()
