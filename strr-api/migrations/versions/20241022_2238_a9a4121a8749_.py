"""empty message

Revision ID: a9a4121a8749
Revises: b661320a5aa8
Create Date: 2024-10-22 22:38:34.961068

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a9a4121a8749'
down_revision = 'b661320a5aa8'
branch_labels = None
depends_on = None


old_options = ('PRIMARY', 'SECONDARY', 'ACCESSORY', 'FLOAT_HOME', 'OTHER')
new_otions = ('SINGLE_FAMILY_HOME', 'SECONDARY_SUITE', 'ACCESSORY_DWELLING', 'MULTI_UNIT_HOUSING', 'TOWN_HOME', 'CONDO_OR_APT',
              'RECREATIONAL', 'BED_AND_BREAKFAST', 'STRATA_HOTEL', 'FLOAT_HOME')

old_type = sa.Enum(*old_options, name='propertytype')
new_type = sa.Enum(*new_otions, name='propertytype')

def upgrade():
    op.execute('ALTER TYPE propertytype RENAME TO tmp_propertytype')
    new_type.create(op.get_bind())
    op.execute('ALTER TABLE rental_properties ALTER COLUMN property_type TYPE propertytype USING property_type::text::propertytype')
    op.execute('ALTER TABLE rental_properties_history ALTER COLUMN property_type TYPE propertytype USING property_type::text::propertytype')
    op.execute('DROP TYPE tmp_propertytype')


def downgrade():
    op.execute('ALTER TYPE propertytype RENAME TO tmp_propertytype')
    old_type.create(op.get_bind())
    op.execute('ALTER TABLE rental_properties ALTER COLUMN property_type TYPE propertytype USING property_type::text::propertytype')
    op.execute('ALTER TABLE rental_properties_history ALTER COLUMN property_type TYPE propertytype USING property_type::text::propertytype')
    op.execute('DROP TYPE tmp_propertytype')
