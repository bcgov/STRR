"""Add application localGov trigram index and registration expiry_date index.

Revision ID: 5b7c8d9e0f1a
Revises: 446a1b2c3d4e
Create Date: 2026-11-24 14:57:00.000000

"""
import logging

from alembic import op
import sqlalchemy as sa

logger = logging.getLogger("alembic.runtime.migration")


# revision identifiers, used by Alembic.
revision = "5b7c8d9e0f1a"
down_revision = "446a1b2c3d4e"
branch_labels = None
depends_on = None


CONCURRENT_INDEXES = (
    (
        "ix_registrations_expiry_date",
        "ON registrations (expiry_date)",
    ),
)

TRGM_INDEXES = (
    (
        "ix_application_local_gov_trgm",
        "ON application USING gin "
        "((application_json -> 'registration' -> 'strRequirements' ->> 'organizationNm') gin_trgm_ops) "
        "WHERE registration_type = 'HOST'",
    ),
)


def _ensure_pg_trgm() -> bool:
    """Ensure pg_trgm is installed if permitted; return whether it is available."""
    conn = op.get_bind()
    if conn.execute(sa.text("SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'")).scalar():
        return True
    try:
        with conn.begin_nested():
            conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        return True
    except Exception as err:  # pylint: disable=broad-except
        logger.warning(
            "Skipping pg_trgm GIN indexes because pg_trgm is not installed and could not be created: %s",
            err,
        )
        return False


def upgrade() -> None:
    has_pg_trgm = _ensure_pg_trgm()
    indexes_to_create = CONCURRENT_INDEXES + (TRGM_INDEXES if has_pg_trgm else ())

    with op.get_context().autocommit_block():
        for index_name, definition in indexes_to_create:
            op.execute(f"CREATE INDEX CONCURRENTLY IF NOT EXISTS {index_name} {definition}")


def downgrade() -> None:
    with op.get_context().autocommit_block():
        for index_name, _ in reversed(CONCURRENT_INDEXES + TRGM_INDEXES):
            op.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {index_name}")
