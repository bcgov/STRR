"""add interaction_recipients table and delivery_status enum

Revision ID: f9a8b7c6d5e4
Revises: e8f7a6b5c4d3
Create Date: 2026-11-05 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "f9a8b7c6d5e4"
down_revision = "e8f7a6b5c4d3"
branch_labels = None
depends_on = None


def upgrade():
    delivery_status = postgresql.ENUM(
        "PENDING",
        "QUEUED",
        "SENDING",
        "DELIVERED",
        "TEMPORARY_FAILURE",
        "PERMANENT_FAILURE",
        "TECHNICAL_FAILURE",
        "BLOCKED",
        name="delivery_status",
        create_type=False,
    )
    delivery_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "interaction_recipients",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("interaction_id", sa.Integer(), nullable=False),
        sa.Column("recipient_role", sa.String(length=50), nullable=True),
        sa.Column("email_address", sa.String(length=320), nullable=False),
        sa.Column(
            "status",
            delivery_status,
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column("failure_type", sa.String(length=50), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("notify_reference", sa.String(length=100), nullable=True),
        sa.Column("provider_reference", sa.String(length=100), nullable=True),
        sa.Column("request_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sent_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "raw_payload",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("version", sa.Integer(), autoincrement=False, nullable=False, server_default="1"),
        sa.ForeignKeyConstraint(
            ["interaction_id"],
            ["interactions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_interaction_recipients_interaction_id"),
        "interaction_recipients",
        ["interaction_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_interaction_recipients_email_address"),
        "interaction_recipients",
        ["email_address"],
        unique=False,
    )
    op.create_index(
        op.f("ix_interaction_recipients_notify_reference"),
        "interaction_recipients",
        ["notify_reference"],
        unique=True,
    )
    op.create_index(
        "ix_interaction_recipients_failure_lookup",
        "interaction_recipients",
        ["interaction_id", "status"],
        unique=False,
        postgresql_where=sa.text(
            "status IN ('PERMANENT_FAILURE', 'TEMPORARY_FAILURE', 'TECHNICAL_FAILURE', 'BLOCKED')"
        ),
    )

    op.create_table(
        "interaction_recipients_history",
        sa.Column("id", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("interaction_id", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("recipient_role", sa.String(length=50), autoincrement=False, nullable=True),
        sa.Column("email_address", sa.String(length=320), autoincrement=False, nullable=False),
        sa.Column("status", delivery_status, autoincrement=False, nullable=False),
        sa.Column("failure_type", sa.String(length=50), autoincrement=False, nullable=True),
        sa.Column("failure_reason", sa.Text(), autoincrement=False, nullable=True),
        sa.Column("notify_reference", sa.String(length=100), autoincrement=False, nullable=True),
        sa.Column("provider_reference", sa.String(length=100), autoincrement=False, nullable=True),
        sa.Column("request_date", sa.DateTime(timezone=True), autoincrement=False, nullable=True),
        sa.Column("sent_date", sa.DateTime(timezone=True), autoincrement=False, nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), autoincrement=False, nullable=False),
        sa.Column(
            "raw_payload",
            postgresql.JSONB(astext_type=sa.Text()),
            autoincrement=False,
            nullable=True,
        ),
        sa.Column("version", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("changed", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["interaction_id"],
            ["interactions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", "version"),
    )
    op.create_index(
        op.f("ix_interaction_recipients_history_interaction_id"),
        "interaction_recipients_history",
        ["interaction_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_interaction_recipients_history_email_address"),
        "interaction_recipients_history",
        ["email_address"],
        unique=False,
    )
    op.create_index(
        op.f("ix_interaction_recipients_history_notify_reference"),
        "interaction_recipients_history",
        ["notify_reference"],
        unique=False,
    )

    op.execute(
        "CREATE OR REPLACE VIEW interaction_recipients_version AS "
        "SELECT * FROM interaction_recipients_history;"
    )


def downgrade():
    op.execute("DROP VIEW IF EXISTS interaction_recipients_version;")

    op.drop_index(
        op.f("ix_interaction_recipients_history_notify_reference"),
        table_name="interaction_recipients_history",
    )
    op.drop_index(
        op.f("ix_interaction_recipients_history_email_address"),
        table_name="interaction_recipients_history",
    )
    op.drop_index(
        op.f("ix_interaction_recipients_history_interaction_id"),
        table_name="interaction_recipients_history",
    )
    op.drop_table("interaction_recipients_history")

    op.drop_index(
        "ix_interaction_recipients_failure_lookup",
        table_name="interaction_recipients",
    )
    op.drop_index(
        op.f("ix_interaction_recipients_notify_reference"),
        table_name="interaction_recipients",
    )
    op.drop_index(
        op.f("ix_interaction_recipients_email_address"),
        table_name="interaction_recipients",
    )
    op.drop_index(
        op.f("ix_interaction_recipients_interaction_id"),
        table_name="interaction_recipients",
    )
    op.drop_table("interaction_recipients")

    delivery_status = postgresql.ENUM(name="delivery_status")
    delivery_status.drop(op.get_bind(), checkfirst=True)
