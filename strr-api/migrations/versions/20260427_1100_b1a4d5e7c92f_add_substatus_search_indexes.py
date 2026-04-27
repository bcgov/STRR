"""Add indexes to support registration sub-status filtering at scale.

Production was hitting CPU 100% / DB timeouts when examiners filtered the
registration dashboard by Sub-Status (Review / Review Renew / Approved). The
correlated scalar subquery in ``Registration._approval_method_condition`` was
forcing a sequential scan of the ``application`` table for every candidate
registration row because ``application.registration_id`` was not indexed.
Filtering by ``noc_status``, ``is_set_aside`` and ``decider_id`` were also
falling back to sequential scans on the ``registrations`` table.

This migration adds the indexes required to turn those access paths into
index scans:

  * ``ix_application_registration_id_date`` - composite ``(registration_id,
    application_date DESC)`` so the latest-application-per-registration
    scalar subquery can be served by a single index lookup. Also benefits
    the EXISTS subquery used by ``_has_renewal_filed_condition``.
  * ``ix_registrations_noc_status`` - partial index on rows where
    ``noc_status IS NOT NULL`` (the only path the filter ever uses).
  * ``ix_registrations_is_set_aside`` - partial index on rows where
    ``is_set_aside = true``.
  * ``ix_registrations_decider_id`` - supports ``decider_id IS NULL`` /
    ``IS NOT NULL`` checks used by the examiner review queue.

All indexes are created with ``CREATE INDEX CONCURRENTLY`` so they do not
take an exclusive lock on the production tables while being built.

Revision ID: b1a4d5e7c92f
Revises: f25ac17d6c02
Create Date: 2026-04-27 11:00:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "b1a4d5e7c92f"
down_revision = "f25ac17d6c02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # CREATE INDEX CONCURRENTLY cannot run inside a transaction block, so we
    # drop into autocommit mode for each index. Using IF NOT EXISTS guards
    # against partial/manual application of the migration.
    with op.get_context().autocommit_block():
        op.execute(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS "
            "ix_application_registration_id_date "
            "ON application (registration_id, application_date DESC)"
        )
        op.execute(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS "
            "ix_registrations_noc_status "
            "ON registrations (noc_status) "
            "WHERE noc_status IS NOT NULL"
        )
        op.execute(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS "
            "ix_registrations_is_set_aside "
            "ON registrations (is_set_aside) "
            "WHERE is_set_aside = true"
        )
        op.execute(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS "
            "ix_registrations_decider_id "
            "ON registrations (decider_id)"
        )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS ix_registrations_decider_id")
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS ix_registrations_is_set_aside")
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS ix_registrations_noc_status")
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS ix_application_registration_id_date")
