import concurrent.futures
import logging
import os
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
    raw_status = data.get("status") or data.get("notifyStatus")
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
        "status_description": status_description,
        "failure_type": failure_type,
        "failure_reason": provider_response or status_description,
        "provider_response": provider_response,
        "email_address": data.get("email_address"),
        "completed_at": data.get("completed_at"),
        "sent_at": data.get("sent_at"),
        "created_at": data.get("created_at"),
        "raw": data,
    }


def fetch_and_update(interaction_id, notify_url, headers, timeout):
    """Worker function to fetch status for a single interaction."""
    # We fetch the interaction in a local session or use IDs to avoid thread-safety issues with ORM objects
    session_gen = get_session()
    session = next(session_gen)
    try:
        interaction = session.get(CustomerInteraction, interaction_id)
        if not interaction:
            return None

        notify_references = _extract_notify_references(interaction)
        if not notify_references:
            return None

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
            resp = requests.get(notify_request, headers=headers, timeout=timeout)
            if resp.status_code != 200:
                logger.warning(
                    "strr.interactions.notify_status_fetch_failed interaction_id=%s notify_reference=%s status_code=%s",
                    interaction_id,
                    notify_reference,
                    resp.status_code,
                )
                continue

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
            existing_meta_data["notifyStatus"] = _normalize_notify_status(
                primary_payload
            )

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
            return new_status
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
    if max_workers is None:
        max_workers = int(os.getenv("MAX_WORKERS", "10"))

    notify_url = os.getenv("NOTIFY_API_URL", "") + os.getenv("NOTIFY_API_VERSION", "")
    os.environ["NOTIFY_SVC_URL"] = notify_url
    notify_timeout = int(os.getenv("NOTIFY_API_TIMEOUT", "10"))

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
            logger.info(
                "strr.interactions.update_completed sent_count=%s delivered_count=0 failed_count=0 stale_sent_count=%s missing_reference_count=%s",
                len(sent_interactions),
                len(stale_interaction_ids),
                missing_reference_count,
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
                futures = [
                    executor.submit(
                        fetch_and_update, i_id, notify_url, headers, notify_timeout
                    )
                    for i_id in interaction_ids
                ]
                for future in concurrent.futures.as_completed(futures):
                    results.append(future.result())

        failed_count = results.count(InteractionStatus.FAILED)
        delivered_count = results.count(InteractionStatus.DELIVERED)
        if failed_count:
            logger.warning(
                "strr.interactions.failed_detected interaction_status=FAILED failed_count=%s",
                failed_count,
            )
        logger.info(
            "strr.interactions.update_completed sent_count=%s delivered_count=%s failed_count=%s stale_sent_count=%s missing_reference_count=%s",
            len(sent_interactions),
            delivered_count,
            failed_count,
            len(stale_interaction_ids),
            missing_reference_count,
        )
    finally:
        session.close()
