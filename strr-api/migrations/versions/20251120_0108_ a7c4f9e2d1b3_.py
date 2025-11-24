"""empty message

Revision ID: a7c4f9e2d1b3
Revises: b4b91e4b40d7
Create Date: 2025-11-20 01:08:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a7c4f9e2d1b3"
down_revision = "b4b91e4b40d7"
branch_labels = None
depends_on = None


def upgrade():
    """Add provisional_extension_applied flag to registrations and history tables."""
    with op.batch_alter_table("registrations", schema=None) as batch_op:
        batch_op.add_column(sa.Column("provisional_extension_applied", sa.Boolean(), nullable=True))

    with op.batch_alter_table("registrations_history", schema=None) as batch_op:
        batch_op.add_column(sa.Column("provisional_extension_applied", sa.Boolean(), nullable=True))


def downgrade():
    """Remove provisional_extension_applied flag from registrations and history tables."""
    with op.batch_alter_table("registrations_history", schema=None) as batch_op:
        batch_op.drop_column("provisional_extension_applied")

    with op.batch_alter_table("registrations", schema=None) as batch_op:
        batch_op.drop_column("provisional_extension_applied")
