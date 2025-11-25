"""Add new document types for Host UI

Revision ID: c8f2e3a4b5d6
Revises: a7c4f9e2d1b3
Create Date: 2025-11-25 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c8f2e3a4b5d6'
down_revision = 'a7c4f9e2d1b3'
branch_labels = None
depends_on = None


old_options = ('BC_DRIVERS_LICENSE', 'PROPERTY_ASSESSMENT_NOTICE', 'SPEC_TAX_CONFIRMATION', 'HOG_DECLARATION', 'ICBC_CERTIFICATE_OF_INSURANCE', 'HOME_INSURANCE_SUMMARY', 'PROPERTY_TAX_NOTICE', 'UTILITY_BILL', 'GOVT_OR_CROWN_CORP_OFFICIAL_NOTICE', 'TENANCY_AGREEMENT', 'RENT_RECEIPT_OR_BANK_STATEMENT', 'LOCAL_GOVT_BUSINESS_LICENSE', 'OTHERS', 'STRATA_HOTEL_DOCUMENTATION', 'FRACTIONAL_OWNERSHIP_AGREEMENT', 'BCSC', 'COMBINED_BCSC_LICENSE')
new_options = ('BC_DRIVERS_LICENSE', 'PROPERTY_ASSESSMENT_NOTICE', 'SPEC_TAX_CONFIRMATION', 'HOG_DECLARATION', 'ICBC_CERTIFICATE_OF_INSURANCE', 'HOME_INSURANCE_SUMMARY', 'PROPERTY_TAX_NOTICE', 'UTILITY_BILL', 'GOVT_OR_CROWN_CORP_OFFICIAL_NOTICE', 'TENANCY_AGREEMENT', 'RENT_RECEIPT_OR_BANK_STATEMENT', 'LOCAL_GOVT_BUSINESS_LICENSE', 'OTHERS', 'STRATA_HOTEL_DOCUMENTATION', 'FRACTIONAL_OWNERSHIP_AGREEMENT', 'BCSC', 'COMBINED_BCSC_LICENSE', 'PROPERTY_TITLE_WITH_FRACTIONAL_OWNERSHIP', 'TITLE_CERTIFICATE_OR_SEARCH', 'SPECULATION_VACANCY_TAX_DECLARATION', 'HOME_OWNER_GRANT_APPROVAL', 'NOTARIZED_REAL_ESTATE_DOC', 'PROPERTY_TRANSFER_TAX_RETURN', 'AFFIDAVIT_PRINCIPAL_RESIDENCE', 'ASSESSMENT_ACT_NOTICE', 'MORTGAGE_STATEMENT_OR_SAVINGS_DOC')

old_type = sa.Enum(*old_options, name='documenttype')
new_type = sa.Enum(*new_options, name='documenttype')


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
