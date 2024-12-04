"""empty message

Revision ID: 0566d52f0869
Revises: 2350c2b87dc6
Create Date: 2024-12-04 06:30:48.109269

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0566d52f0869'
down_revision = '2350c2b87dc6'
branch_labels = None
depends_on = None


old_options = ('OWN', 'CO_OWN', 'RENT')
new_otions = ('OWN', 'CO_OWN', 'RENT', 'OTHER')

old_type = sa.Enum(*old_options, name='ownershiptype')
new_type = sa.Enum(*new_otions, name='ownershiptype')


def upgrade():
    op.execute('ALTER TYPE ownershiptype RENAME TO tmp_ownershiptype')
    new_type.create(op.get_bind())
    op.execute('ALTER TABLE rental_properties ALTER COLUMN ownership_type TYPE ownershiptype USING ownership_type::text::ownershiptype')
    op.execute('ALTER TABLE rental_properties_history ALTER COLUMN ownership_type TYPE ownershiptype USING ownership_type::text::ownershiptype')
    op.execute('DROP TYPE tmp_ownershiptype')


def downgrade():
    op.execute('ALTER TYPE ownershiptype RENAME TO tmp_ownershiptype')
    old_type.create(op.get_bind())
    op.execute('ALTER TABLE rental_properties ALTER COLUMN ownership_type TYPE ownershiptype USING ownership_type::text::ownershiptype')
    op.execute('ALTER TABLE rental_properties_history ALTER COLUMN ownership_type TYPE ownershiptype USING ownership_type::text::ownershiptype')
    op.execute('DROP TYPE tmp_ownershiptype')
