"""empty message

Revision ID: b7d5c2a9f6e1
Revises: 8f4e7b2c9d6a
Create Date: 2025-04-22 09:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b7d5c2a9f6e1'
down_revision = '8f4e7b2c9d6a'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('registrations', schema=None) as batch_op:
        batch_op.create_index('ix_registrations_registration_type', ['registration_type'])
        batch_op.create_index('ix_registrations_status', ['status'])

def downgrade():
    with op.batch_alter_table('registrations', schema=None) as batch_op:
        batch_op.drop_index('ix_registrations_status')
        batch_op.drop_index('ix_registrations_registration_type')
