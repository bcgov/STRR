import concurrent.futures
import logging
import os
from datetime import datetime
from datetime import timedelta
from datetime import timezone
from enum import StrEnum

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


class UpdateResult(StrEnum):
    """Job outcomes that do not map to a terminal Notify delivery status."""

    MISSING_REFERENCE = "MISSING_REFERENCE"
    UNCHANGED = "UNCHANGED"


def fetch_and_update(interaction_id, notify_url, headers, timeout):
    """Worker function to fetch status for a single interaction."""
    # We fetch the interaction in a local session or use IDs to avoid thread-safety issues with ORM objects
    session_gen = get_session()
    session = next(session_gen)
    try:
        interaction = session.get(CustomerInteraction, interaction_id)
        if not interaction or not interaction.notify_reference:
            return UpdateResult.MISSING_REFERENCE

        notify_request = f"{notify_url}/notify/{interaction.notify_reference}"
        resp = requests.get(notify_request, headers=headers, timeout=timeout)

        if resp.status_code == 200:
            data = resp.json()
            status_mapping = {
                "DELIVERED": InteractionStatus.DELIVERED,
                "FAILURE": InteractionStatus.FAILED,
                "TECHNICAL_FAILURE": InteractionStatus.FAILED,
                "PERMANENT_FAILURE": InteractionStatus.FAILED,
            }
            new_status = status_mapping.get(data.get("notifyStatus"))

            if new_status and new_status != interaction.status:
                interaction.status = new_status
                interaction.provider_reference = str(data.get("id"))
                interaction.meta_data = data
                session.commit()
                return new_status
        return UpdateResult.UNCHANGED
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
            case(
                (CustomerInteraction.created_at < stale_threshold, True), else_=False
            ).label("is_stale"),
        ).where(CustomerInteraction.status == InteractionStatus.SENT)
        sent_interactions = session.execute(stmt).all()
        interaction_ids = [row.id for row in sent_interactions]
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
                "strr.interactions.update_completed sent_count=0 stale_sent_count=%s",
                len(stale_interaction_ids),
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
            "strr.interactions.update_completed sent_count=%s delivered_count=%s failed_count=%s stale_sent_count=%s",
            len(interaction_ids),
            delivered_count,
            failed_count,
            len(stale_interaction_ids),
        )
    finally:
        session.close()
