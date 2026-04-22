import logging
import random
import time
import uuid
from datetime import datetime
from datetime import timedelta
from datetime import timezone

import pytest
from sqlalchemy import insert
from sqlalchemy.orm import Session

from strr_api.enums.enum import ChannelType
from strr_api.enums.enum import InteractionStatus
from strr_api.models import Application
from strr_api.models import CustomerInteraction
from strr_api.models import Registration
from strr_api.models import User

logger = logging.getLogger(__name__)


@pytest.fixture
def setup_bulk_interactions(
    request, db_session: Session, random_string, random_integer
):
    """
    Bulk seeds Registrations, Applications, and CustomerInteractions.
    Supports targeted expiry date distributions for notification testing.
    """
    # Default parameters
    n_records = 10
    chunk_size = 2000  # Optimal size for batch inserts
    target_days = []  # e.g., [0, 15, 30, 45, 60]
    target_pct = 1.0

    # Extract test-specific parameters if passed via @pytest.mark.parametrize(..., indirect=True)
    if hasattr(request, "param") and isinstance(request.param, dict):
        n_records = request.param.get("records", 10)
        chunk_size = request.param.get("chunk_size", 2000)
        target_days = request.param.get("target_days", [])
        target_pct = request.param.get("target_pct", 1.0)

    # Setup Parents
    customer = User()
    user = User()
    db_session.add_all([user, customer])
    db_session.flush()

    now = datetime.now(timezone.utc).date()
    expiry_dates = []

    # Calculate distributions IFF targets were passed in
    if target_days and target_pct > 0:
        count_per_target = int(n_records * target_pct)
        remaining_count = n_records - (count_per_target * len(target_days))

        # Generate targeted dates
        for days_out in target_days:
            target_date = now + timedelta(days=days_out)
            expiry_dates.extend([target_date] * count_per_target)

        # Generate noise dates (distribute over 120 days, avoiding targets)
        allowed_noise_days = [d for d in range(120) if d not in target_days]
        for _ in range(remaining_count):
            random_days = random.choice(allowed_noise_days)
            expiry_dates.append(now + timedelta(days=random_days))
    else:
        # Fallback for standard tests: just make everything expire in 1 year
        expiry_dates = [now + timedelta(days=365)] * n_records

    # Shuffle the dates so they are randomized in the database
    random.shuffle(expiry_dates)

    # Lists to hold all generated IDs across all chunks
    all_reg_ids = []
    all_app_ids = []
    all_interaction_ids = []

    start_time = time.perf_counter()

    # Create a reverse mapping so we can translate a 'date' back to the 'days_out' integer
    target_dates_map = {}
    for days_out in target_days:
        target_date = now + timedelta(days=days_out)
        target_dates_map[target_date] = days_out

    # Dictionary to hold our final grouped IDs (e.g., {40: [id1, id2...]})
    target_reg_ids = {days_out: [] for days_out in target_days}

    # Loop through the total records in steps of 'chunk_size'
    for offset in range(0, n_records, chunk_size):
        current_chunk_size = min(chunk_size, n_records - offset)
        chunk_dates = expiry_dates[offset : offset + current_chunk_size]

        # Prepare & Insert Registrations
        regs_data = [
            {
                "registration_type": Registration.RegistrationType.HOST,
                # Add a random suffix to prevent cross-test collisions
                "registration_number": "H"
                + f"{offset + i}".zfill(8)
                + random_string(5),
                "sbc_account_id": random_integer() + offset + i,
                "status": "ACTIVE",
                "user_id": user.id,
                "start_date": now,
                "expiry_date": chunk_dates[i],
            }
            for i in range(current_chunk_size)
        ]
        chunk_reg_ids = db_session.scalars(
            insert(Registration).returning(Registration.id), regs_data
        ).all()
        all_reg_ids.extend(chunk_reg_ids)

        # Prepare & Insert Applications
        apps_data = [
            {
                "application_json": {},
                "registration_id": reg_id,
                # Add a random suffix here as well
                "application_number": f"{offset + i}".zfill(9) + random_string(5),
                "type": "",
                "registration_type": Registration.RegistrationType.HOST,
            }
            for i, reg_id in enumerate(chunk_reg_ids)
        ]
        chunk_app_ids = db_session.scalars(
            insert(Application).returning(Application.id), apps_data
        ).all()
        all_app_ids.extend(chunk_app_ids)

        # Prepare & Insert CustomerInteractions
        job_date = now.isoformat()
        notification_type = "RENEWAL_REMINDER:40"
        interactions_data = [
            {
                "interaction_uuid": str(uuid.uuid4()),
                "idempotency_key": f"{job_date}:{notification_type}:{reg_id}",
                "channel": ChannelType.EMAIL,
                "status": InteractionStatus.SENT,
                "body_content": f"Bulk test email for reg {reg_id}",
                "registration_id": reg_id,
                "user_id": user.id,
                "created_at": datetime.now(timezone.utc),
            }
            for reg_id in chunk_reg_ids
        ]

        chunk_interaction_ids = db_session.scalars(
            insert(CustomerInteraction).returning(CustomerInteraction.id),
            interactions_data,
        ).all()
        all_interaction_ids.extend(chunk_interaction_ids)

        # Update mapping for target tracking
        for reg_id, exp_date in zip(chunk_reg_ids, chunk_dates):
            if exp_date in target_dates_map:
                days_out = target_dates_map[exp_date]
                target_reg_ids[days_out].append(reg_id)

    # Finalize
    db_session.flush()
    end_time = time.perf_counter()
    duration = end_time - start_time

    print(
        f"\n[PROFILER] Inserted {n_records} records (Regs, Apps, Interactions) "
        f"in chunks of {chunk_size} -> Time: {duration:.3f} seconds"
    )

    return {
        "customer_id": customer.id,
        "user_id": user.id,
        "record_count": n_records,
        "registration_ids": all_reg_ids,
        "application_ids": all_app_ids,
        "interaction_ids": all_interaction_ids,
        "target_reg_ids": target_reg_ids,
    }
