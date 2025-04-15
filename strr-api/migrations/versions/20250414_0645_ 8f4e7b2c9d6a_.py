"""empty message

Revision ID: 8f4e7b2c9d6a
Revises: 7d3f2a9c1b5e
Create Date: 2025-04-14 06:45:32.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8f4e7b2c9d6a'
down_revision = '7d3f2a9c1b5e'
branch_labels = None
depends_on = None

old_options = ('APPLICATION_SUBMITTED', 'INVOICE_GENERATED', 'PAYMENT_COMPLETE', 'PENDING_AUTO_APPROVAL_PROCESSING', 'AUTO_APPROVAL_FULL_REVIEW', 'AUTO_APPROVAL_PROVISIONAL', 'AUTO_APPROVAL_APPROVED', 'FULL_REVIEW_IN_PROGRESS', 'MANUALLY_APPROVED', 'MANUALLY_DENIED', 'MORE_INFORMATION_REQUESTED', 'REGISTRATION_CREATED', 'CERTIFICATE_ISSUED', 'REGISTRATION_EXPIRED', 'NON_COMPLIANCE_SUSPENDED', 'REGISTRATION_CANCELLED', 'APPLICATION_REVIEWER_ASSIGNED', 'APPLICATION_REVIEWER_UNASSIGNED', 'NOC_SENT', 'NOC_EXPIRED')
new_options = ('APPLICATION_SUBMITTED', 'INVOICE_GENERATED', 'PAYMENT_COMPLETE', 'PENDING_AUTO_APPROVAL_PROCESSING', 'AUTO_APPROVAL_FULL_REVIEW', 'AUTO_APPROVAL_PROVISIONAL', 'AUTO_APPROVAL_APPROVED', 'FULL_REVIEW_IN_PROGRESS', 'MANUALLY_APPROVED', 'MANUALLY_DENIED', 'MORE_INFORMATION_REQUESTED', 'REGISTRATION_CREATED', 'CERTIFICATE_ISSUED', 'REGISTRATION_EXPIRED', 'NON_COMPLIANCE_SUSPENDED', 'REGISTRATION_CANCELLED', 'APPLICATION_REVIEWER_ASSIGNED', 'APPLICATION_REVIEWER_UNASSIGNED', 'NOC_SENT', 'NOC_EXPIRED', 'HOST_APPLICATION_UNIT_ADDRESS_UPDATED', 'HOST_REGISTRATION_UNIT_ADDRESS_UPDATED')

old_type = sa.Enum(*old_options, name='eventname')
new_type = sa.Enum(*new_options, name='eventname')

def upgrade():
    op.execute('ALTER TYPE eventname RENAME TO tmp_eventname')
    new_type.create(op.get_bind())
    op.execute('ALTER TABLE events ALTER COLUMN event_name TYPE eventname USING event_name::text::eventname')
    op.execute('DROP TYPE tmp_eventname')


def downgrade():
    op.execute('ALTER TYPE eventname RENAME TO tmp_eventname')
    old_type.create(op.get_bind())
    op.execute('ALTER TABLE events ALTER COLUMN event_name TYPE eventname USING event_name::text::eventname')
    op.execute('DROP TYPE tmp_eventname')
