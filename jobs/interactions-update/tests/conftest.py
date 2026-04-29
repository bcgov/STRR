"""Pytest plugins, engine reset, and job fixtures (same layout as other STRR jobs)."""

from __future__ import annotations

import random
import uuid
from datetime import date
from datetime import datetime
from datetime import timedelta
from datetime import timezone
from typing import Any

import pytest
from sqlalchemy import insert
from sqlalchemy.orm import Session
from sqlalchemy.orm import sessionmaker

from interactions_update import database
from strr_api.enums.enum import ChannelType
from strr_api.enums.enum import InteractionStatus
from strr_api.models import Application
from strr_api.models import CustomerInteraction
from strr_api.models import Registration
from strr_api.models import User

pytest_plugins = [
    "strr_test_utils.utils_fixtures",
    "strr_test_utils.db_fixtures",
]

_NOTIFY_BASE = "https://my-notify-mock"
_AUTH_URL = "https://my-auth-url"


def _build_expiry_dates(
    *,
    today: date,
    n_records: int,
    target_days: list[int],
    target_pct: float,
) -> list[date]:
    rng = random.SystemRandom()
    if target_days and target_pct > 0:
        count_per_target = int(n_records * target_pct)
        remaining = n_records - count_per_target * len(target_days)
        dates: list[date] = []
        for d in target_days:
            dates.extend([today + timedelta(days=d)] * count_per_target)
        noise_days = [d for d in range(120) if d not in target_days]
        for _ in range(remaining):
            dates.append(today + timedelta(days=rng.choice(noise_days)))
    else:
        dates = [today + timedelta(days=365)] * n_records
    rng.shuffle(dates)
    return dates


@pytest.fixture
def notify_job_integration_env(monkeypatch):
    """Notify + Keycloak SA env for mocked HTTP job runs."""
    ver = "/api/v1"
    svc = _NOTIFY_BASE + ver
    env_flat = {
        "NOTIFY_API_URL": _NOTIFY_BASE,
        "NOTIFY_API_VERSION": ver,
        "NOTIFY_SVC_URL": svc,
        "KEYCLOAK_AUTH_TOKEN_URL": _AUTH_URL,
        "NOTIFY_API_TIMEOUT": "30",
        "AUTH_SVC_TIMEOUT": "30",
        "STRR_SERVICE_ACCOUNT_CLIENT_ID": "strr-sa-client-id",
        "STRR_SERVICE_ACCOUNT_SECRET": "strr-sa-secret",
    }
    for key, val in env_flat.items():
        monkeypatch.setenv(key, val)
    return {
        "notify_url": _NOTIFY_BASE,
        "notify_ver": ver,
        "notify_svc": svc,
        "auth_url": _AUTH_URL,
    }


@pytest.fixture
def db_session(db_engine):
    """Session on the migrated DB; commits visible to ``get_engine()`` / ``job.run()``."""
    factory = sessionmaker(bind=db_engine, expire_on_commit=False)
    session = factory()
    yield session
    session.close()


@pytest.fixture
def setup_bulk_interactions(
    request: pytest.FixtureRequest, db_session: Session, random_string, random_integer
):
    """Seed Registrations, Applications, and CustomerInteractions (parametrize via dict)."""
    p: dict = (
        request.param
        if hasattr(request, "param") and isinstance(request.param, dict)
        else {}
    )
    n_records = p.get("records", 10)
    chunk_size = p.get("chunk_size", 2000)
    target_days = p.get("target_days", [])
    target_pct = p.get("target_pct", 1.0)

    customer = User()
    user = User()
    db_session.add_all([user, customer])
    db_session.flush()

    now = datetime.now(timezone.utc).date()
    expiry_dates = _build_expiry_dates(
        today=now,
        n_records=n_records,
        target_days=target_days,
        target_pct=target_pct,
    )

    all_reg_ids: list[Any] = []
    all_app_ids: list[Any] = []
    all_interaction_ids: list[Any] = []
    target_dates_map = {now + timedelta(days=d): d for d in target_days}
    target_reg_ids = {d: [] for d in target_days}

    for offset in range(0, n_records, chunk_size):
        cur = min(chunk_size, n_records - offset)
        chunk_dates = expiry_dates[offset : offset + cur]

        regs_data = [
            {
                "registration_type": Registration.RegistrationType.HOST,
                "registration_number": "H"
                + f"{offset + i}".zfill(8)
                + random_string(5),
                "sbc_account_id": random_integer() + offset + i,
                "status": "ACTIVE",
                "user_id": user.id,
                "start_date": now,
                "expiry_date": chunk_dates[i],
            }
            for i in range(cur)
        ]
        reg_ids = db_session.scalars(
            insert(Registration).returning(Registration.id), regs_data
        ).all()
        all_reg_ids.extend(reg_ids)

        apps_data = [
            {
                "application_json": {},
                "registration_id": rid,
                "application_number": f"{offset + i}".zfill(9) + random_string(5),
                "type": "",
                "registration_type": Registration.RegistrationType.HOST,
            }
            for i, rid in enumerate(reg_ids)
        ]
        app_ids = db_session.scalars(
            insert(Application).returning(Application.id), apps_data
        ).all()
        all_app_ids.extend(app_ids)

        job_date = now.isoformat()
        notification_type = "RENEWAL_REMINDER:40"
        interactions_data = [
            {
                "interaction_uuid": str(uuid.uuid4()),
                "idempotency_key": f"{job_date}:{notification_type}:{rid}",
                "channel": ChannelType.EMAIL,
                "status": InteractionStatus.SENT,
                "body_content": f"Bulk test email for reg {rid}",
                "registration_id": rid,
                "user_id": user.id,
                "created_at": datetime.now(timezone.utc),
            }
            for rid in reg_ids
        ]
        iids = db_session.scalars(
            insert(CustomerInteraction).returning(CustomerInteraction.id),
            interactions_data,
        ).all()
        all_interaction_ids.extend(iids)

        for rid, exp_date in zip(reg_ids, chunk_dates):
            if exp_date in target_dates_map:
                target_reg_ids[target_dates_map[exp_date]].append(rid)

    db_session.flush()

    return {
        "customer_id": customer.id,
        "user_id": user.id,
        "record_count": n_records,
        "registration_ids": all_reg_ids,
        "application_ids": all_app_ids,
        "interaction_ids": all_interaction_ids,
        "target_reg_ids": target_reg_ids,
    }


@pytest.fixture(autouse=True)
def reset_database_engine_singleton():
    """Clear ``database._engine`` between tests (singleton + env isolation)."""
    database._engine = None
    yield
    database._engine = None
