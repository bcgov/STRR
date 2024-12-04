"""empty message

Revision ID: 3e8d07a339d5
Revises: 0566d52f0869
Create Date: 2024-12-04 07:05:14.710918

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '3e8d07a339d5'
down_revision = '0566d52f0869'
branch_labels = None
depends_on = None


old_options = ('BC_DRIVERS_LICENSE', 'PROPERTY_ASSESSMENT_NOTICE', 'SPEC_TAX_CONFIRMATION', 'HOG_DECLARATION', 'ICBC_CERTIFICATE_OF_INSURANCE', 'HOME_INSURANCE_SUMMARY', 'PROPERTY_TAX_NOTICE', 'UTILITY_BILL', 'GOVT_OR_CROWN_CORP_OFFICIAL_NOTICE', 'TENANCY_AGREEMENT', 'RENT_RECEIPT_OR_BANK_STATEMENT', 'LOCAL_GOVT_BUSINESS_LICENSE', 'OTHERS')
new_otions = ('BC_DRIVERS_LICENSE', 'PROPERTY_ASSESSMENT_NOTICE', 'SPEC_TAX_CONFIRMATION', 'HOG_DECLARATION', 'ICBC_CERTIFICATE_OF_INSURANCE', 'HOME_INSURANCE_SUMMARY', 'PROPERTY_TAX_NOTICE', 'UTILITY_BILL', 'GOVT_OR_CROWN_CORP_OFFICIAL_NOTICE', 'TENANCY_AGREEMENT', 'RENT_RECEIPT_OR_BANK_STATEMENT', 'LOCAL_GOVT_BUSINESS_LICENSE', 'OTHERS', 'STRATA_HOTEL_DOCUMENTATION', 'FRACTIONAL_OWNERSHIP_AGREEMENT', 'BCSC', 'COMBINED_BCSC_LICENCE')

old_type = sa.Enum(*old_options, name='documenttype')
new_type = sa.Enum(*new_otions, name='documenttype')


def upgrade():
    op.execute('ALTER TYPE documenttype RENAME TO tmp_documenttype')
    new_type.create(op.get_bind())
    op.execute('ALTER TABLE documents ALTER COLUMN document_type TYPE documenttype USING document_type::text::documenttype')
    op.execute('ALTER TABLE documents_history ALTER COLUMN document_type TYPE documenttype USING document_type::text::documenttype')
    op.execute('DROP TYPE tmp_documenttype')


def downgrade():
    op.execute('ALTER TYPE documenttype RENAME TO tmp_documenttype')
    old_type.create(op.get_bind())
    op.execute('ALTER TABLE documents ALTER COLUMN document_type TYPE documenttype USING document_type::text::documenttype')
    op.execute('ALTER TABLE documents_history ALTER COLUMN document_type TYPE documenttype USING document_type::text::documenttype')
    op.execute('DROP TYPE tmp_documenttype')
    # ### end Alembic commands ###
