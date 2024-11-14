"""empty message

Revision ID: 5c6d73a45f6a
Revises: 8c8a9bfdfbfa
Create Date: 2024-11-14 06:10:34.069307

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '5c6d73a45f6a'
down_revision = '8c8a9bfdfbfa'
branch_labels = None
depends_on = None


old_options = ('GREATER_THAN_THOUSAND', 'LESS_THAN_THOUSAND')
new_otions = ('LESS_THAN_250', 'BETWEEN_250_AND_999', 'THOUSAND_AND_ABOVE')

old_type = sa.Enum(*old_options, name='listingsize')
new_type = sa.Enum(*new_otions, name='listingsize')


def upgrade():
    op.execute('ALTER TYPE listingsize RENAME TO tmp_listingsize')
    new_type.create(op.get_bind())
    op.execute('ALTER TABLE platforms ALTER COLUMN listing_size TYPE listingsize USING listing_size::text::listingsize')
    op.execute('ALTER TABLE platforms_history ALTER COLUMN listing_size TYPE listingsize USING listing_size::text::listingsize')
    op.execute('DROP TYPE tmp_listingsize')


def downgrade():
    op.execute('ALTER TYPE listingsize RENAME TO tmp_listingsize')
    old_type.create(op.get_bind())
    op.execute('ALTER TABLE platforms ALTER COLUMN listing_size TYPE listingsize USING listing_size::text::listingsize')
    op.execute('ALTER TABLE platforms_history ALTER COLUMN listing_size TYPE listingsize USING listing_size::text::listingsize')
    op.execute('DROP TYPE tmp_listingsize')
