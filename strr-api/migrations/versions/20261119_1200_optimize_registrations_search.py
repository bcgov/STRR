"""Optimize registrations search indexes and upgrade documents.added_on to DateTime(timezone=True).

Revision ID: 446a1b2c3d4e
Revises: f9a8b7c6d5e4
Create Date: 2026-11-19 12:00:00.000000

"""
import logging

from alembic import op
import sqlalchemy as sa

logger = logging.getLogger("alembic.runtime.migration")


# revision identifiers, used by Alembic.
revision = "446a1b2c3d4e"
down_revision = "f9a8b7c6d5e4"
branch_labels = None
depends_on = None


DOCUMENT_TABLES = ("documents", "documents_history")

CONCURRENT_INDEXES = (
    # Sub-status & assignee filter indexes (partial for smaller footprint)
    (
        "ix_registrations_reviewer_id",
        "ON registrations (reviewer_id) WHERE reviewer_id IS NOT NULL",
    ),
    (
        "ix_application_registration_id_type",
        "ON application (registration_id, type) WHERE registration_id IS NOT NULL",
    ),
    # Foreign-key indexes for Registration.apply_serialization_eager_loading
    ("ix_documents_registration_id", "ON documents (registration_id)"),
    ("ix_rental_properties_registration_id", "ON rental_properties (registration_id)"),
    ("ix_property_contacts_property_id", "ON property_contacts (property_id)"),
    ("ix_property_listings_property_id", "ON property_listings (property_id)"),
    (
        "ix_conditions_of_approval_registration_id",
        "ON conditions_of_approval (registration_id)",
    ),
    (
        "ix_registration_noc_registration_id",
        "ON registration_notice_of_consideration (registration_id)",
    ),
    (
        "ix_platform_registration_registration_id",
        "ON platform_registration (registration_id)",
    ),
    (
        "ix_strata_hotel_registration_registration_id",
        "ON strata_hotel_registration (registration_id)",
    ),
)

TRGM_INDEXES = (
    # Trigram GIN indexes for leading-wildcard ILIKE '%...%' filters
    (
        "ix_registrations_registration_number_trgm",
        "ON registrations USING gin (registration_number gin_trgm_ops)",
    ),
    (
        "ix_users_username_trgm",
        "ON users USING gin (username gin_trgm_ops)",
    ),
    (
        "ix_rental_properties_jurisdiction_trgm",
        "ON rental_properties USING gin (jurisdiction gin_trgm_ops)",
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
    # Existing DATE values become midnight America/Vancouver so UI Pacific date formatting
    # preserves the original calendar day before/without GCS backfill.
    for table in DOCUMENT_TABLES:
        op.alter_column(
            table,
            "added_on",
            existing_type=sa.Date(),
            type_=sa.DateTime(timezone=True),
            existing_nullable=True,
            postgresql_using="added_on::timestamp AT TIME ZONE 'America/Vancouver'",
        )

    has_pg_trgm = _ensure_pg_trgm()
    indexes_to_create = CONCURRENT_INDEXES + (TRGM_INDEXES if has_pg_trgm else ())

    with op.get_context().autocommit_block():
        for index_name, definition in indexes_to_create:
            op.execute(f"CREATE INDEX CONCURRENTLY IF NOT EXISTS {index_name} {definition}")


def downgrade() -> None:
    with op.get_context().autocommit_block():
        for index_name, _ in reversed(CONCURRENT_INDEXES + TRGM_INDEXES):
            op.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {index_name}")

    for table in reversed(DOCUMENT_TABLES):
        op.alter_column(
            table,
            "added_on",
            existing_type=sa.DateTime(timezone=True),
            type_=sa.Date(),
            existing_nullable=True,
            postgresql_using="(added_on AT TIME ZONE 'America/Vancouver')::date",
        )
