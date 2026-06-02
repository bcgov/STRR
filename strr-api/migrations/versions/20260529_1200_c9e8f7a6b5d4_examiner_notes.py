"""Create examiner_notes table for staff examiner notes on applications/registrations.

Revision ID: c9e8f7a6b5d4
Revises: b1a4d5e7c92f
Create Date: 2026-06-02 08:54:08.000000

"""

import sqlalchemy as sa
from alembic import op

revision = "c9e8f7a6b5d4"
down_revision = "b1a4d5e7c92f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "examiner_notes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=True),
        sa.Column("registration_id", sa.Integer(), nullable=True),
        sa.Column("author_user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["application_id"], ["application.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["registration_id"], ["registrations.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["author_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "(application_id IS NOT NULL AND registration_id IS NULL) "
            "OR (application_id IS NULL AND registration_id IS NOT NULL)",
            name="chk_examiner_notes_single_parent",
        ),
    )
    op.execute("""
        CREATE INDEX ix_examiner_notes_application_id_created_at
            ON examiner_notes (application_id, created_at DESC)
            WHERE application_id IS NOT NULL
        """)
    op.execute("""
        CREATE INDEX ix_examiner_notes_registration_id_created_at
            ON examiner_notes (registration_id, created_at DESC)
            WHERE registration_id IS NOT NULL
        """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_examiner_notes_registration_id_created_at")
    op.execute("DROP INDEX IF EXISTS ix_examiner_notes_application_id_created_at")
    op.drop_table("examiner_notes")
