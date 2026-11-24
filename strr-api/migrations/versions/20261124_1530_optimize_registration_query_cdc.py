"""Optimize RegistrationQuery CDC timestamp and child FK indexes.

Revision ID: 6c8d9e0f1a2b
Revises: 5b7c8d9e0f1a
Create Date: 2026-11-24 15:30:00.000000

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "6c8d9e0f1a2b"
down_revision = "5b7c8d9e0f1a"
branch_labels = None
depends_on = None


CONCURRENT_INDEXES = (
    # CDC incremental sync (updatedSince / cursor_changed) timestamp indexes
    ("ix_registrations_updated_date", "ON registrations (updated_date)"),
    ("ix_registrations_history_changed", "ON registrations_history (changed)"),
    ("ix_rental_properties_history_changed", "ON rental_properties_history (changed)"),
    ("ix_platform_registration_history_changed", "ON platform_registration_history (changed)"),
    ("ix_strata_hotel_registration_history_changed", "ON strata_hotel_registration_history (changed)"),
    # Remaining eager-loading child FK indexes for RegistrationQuery
    ("ix_platform_representatives_platform_id", "ON platform_representatives (platform_id)"),
    ("ix_platform_brands_platform_id", "ON platform_brands (platform_id)"),
    ("ix_strata_hotel_representatives_strata_hotel_id", "ON strata_hotel_representatives (strata_hotel_id)"),
    ("ix_strata_hotel_buildings_strata_hotel_id", "ON strata_hotel_buildings (strata_hotel_id)"),
)


def upgrade() -> None:
    with op.get_context().autocommit_block():
        for index_name, definition in CONCURRENT_INDEXES:
            op.execute(f"CREATE INDEX CONCURRENTLY IF NOT EXISTS {index_name} {definition}")


def downgrade() -> None:
    with op.get_context().autocommit_block():
        for index_name, _ in reversed(CONCURRENT_INDEXES):
            op.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {index_name}")
