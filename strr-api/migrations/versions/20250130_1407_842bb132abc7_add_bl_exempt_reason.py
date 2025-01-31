"""add_bl_exempt_reason

Revision ID: 842bb132abc7
Revises: eaaf302a8c3f
Create Date: 2025-01-30 14:07:24.879085

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '842bb132abc7'
down_revision = 'eaaf302a8c3f'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('rental_properties', schema=None) as batch_op:
        batch_op.add_column(sa.Column('bl_exempt_reason', sa.String(), nullable=True))

    with op.batch_alter_table('rental_properties_history', schema=None) as batch_op:
        batch_op.add_column(sa.Column('bl_exempt_reason', sa.String(), autoincrement=False, nullable=True))


def downgrade():
    with op.batch_alter_table('rental_properties', schema=None) as batch_op:
        batch_op.drop_column('bl_exempt_reason')

    with op.batch_alter_table('rental_properties_history', schema=None) as batch_op:
        batch_op.drop_column('bl_exempt_reason')
