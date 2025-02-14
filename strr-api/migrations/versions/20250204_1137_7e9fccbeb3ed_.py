"""empty message

Revision ID: 7e9fccbeb3ed
Revises: 842bb132abc7
Create Date: 2025-02-04 11:37:53.005700

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '7e9fccbeb3ed'
down_revision = '842bb132abc7'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('rental_properties', schema=None) as batch_op:
        batch_op.add_column(sa.Column('strata_hotel_category', sa.Enum('FULL_SERVICE', 'MULTI_UNIT_NON_PR', 'POST_DECEMBER_2023', name='stratahotelcategory'), nullable=True))
        batch_op.create_index(batch_op.f('ix_rental_properties_strata_hotel_category'), ['strata_hotel_category'], unique=False)

    with op.batch_alter_table('rental_properties_history', schema=None) as batch_op:
        batch_op.add_column(sa.Column('strata_hotel_category', sa.Enum('FULL_SERVICE', 'MULTI_UNIT_NON_PR', 'POST_DECEMBER_2023', name='stratahotelcategory'), autoincrement=False, nullable=True))
        batch_op.create_index(batch_op.f('ix_rental_properties_history_strata_hotel_category'), ['strata_hotel_category'], unique=False)


def downgrade():
    with op.batch_alter_table('rental_properties', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_rental_properties_strata_hotel_category'))
        batch_op.drop_column('strata_hotel_category')

    with op.batch_alter_table('rental_properties_history', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_rental_properties_history_strata_hotel_category'))
        batch_op.drop_column('strata_hotel_category')
