"""empty message

Revision ID: 7d3f2a9c1b5e
Revises: 4b8c0e9d2f6a
Create Date: 2025-04-03 11:04:48.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7d3f2a9c1b5e'
down_revision = '4b8c0e9d2f6a'
branch_labels = None
depends_on = None


old_options = ('APPLICATION_SUBMITTED', 'INVOICE_GENERATED', 'PAYMENT_COMPLETE', 'PENDING_AUTO_APPROVAL_PROCESSING', 'AUTO_APPROVAL_FULL_REVIEW', 'AUTO_APPROVAL_PROVISIONAL', 'AUTO_APPROVAL_APPROVED', 'FULL_REVIEW_IN_PROGRESS', 'MANUALLY_APPROVED', 'MANUALLY_DENIED', 'MORE_INFORMATION_REQUESTED', 'REGISTRATION_CREATED', 'CERTIFICATE_ISSUED', 'REGISTRATION_EXPIRED', 'NON_COMPLIANCE_SUSPENDED', 'REGISTRATION_CANCELLED', 'APPLICATION_REVIEWER_ASSIGNED', 'APPLICATION_REVIEWER_UNASSIGNED')
new_options = ('APPLICATION_SUBMITTED', 'INVOICE_GENERATED', 'PAYMENT_COMPLETE', 'PENDING_AUTO_APPROVAL_PROCESSING', 'AUTO_APPROVAL_FULL_REVIEW', 'AUTO_APPROVAL_PROVISIONAL', 'AUTO_APPROVAL_APPROVED', 'FULL_REVIEW_IN_PROGRESS', 'MANUALLY_APPROVED', 'MANUALLY_DENIED', 'MORE_INFORMATION_REQUESTED', 'REGISTRATION_CREATED', 'CERTIFICATE_ISSUED', 'REGISTRATION_EXPIRED', 'NON_COMPLIANCE_SUSPENDED', 'REGISTRATION_CANCELLED', 'APPLICATION_REVIEWER_ASSIGNED', 'APPLICATION_REVIEWER_UNASSIGNED', 'NOC_SENT', 'NOC_EXPIRED')

old_type = sa.Enum(*old_options, name='eventname')
new_type = sa.Enum(*new_options, name='eventname')


def upgrade():
    with op.batch_alter_table('events', schema=None) as batch_op:
        batch_op.alter_column('created_date',
                            existing_type=sa.DateTime(),
                            type_=sa.DateTime(timezone=True),
                            nullable=False)
    
    with op.batch_alter_table('notice_of_consideration', schema=None) as batch_op:
        batch_op.alter_column('creation_date',
                            existing_type=sa.DateTime(),
                            type_=sa.DateTime(timezone=True),
                            nullable=False)

    op.execute('ALTER TYPE eventname RENAME TO tmp_eventname')
    new_type.create(op.get_bind())
    op.execute('ALTER TABLE events ALTER COLUMN event_name TYPE eventname USING event_name::text::eventname')
    op.execute('DROP TYPE tmp_eventname')


def downgrade():    
    with op.batch_alter_table('events', schema=None) as batch_op:
        batch_op.alter_column('created_date',
                            existing_type=sa.DateTime(timezone=True),
                            type_=sa.DateTime(),
                            nullable=False)
    
    with op.batch_alter_table('notice_of_consideration', schema=None) as batch_op:
        batch_op.alter_column('creation_date',
                            existing_type=sa.DateTime(timezone=True),
                            type_=sa.DateTime(),
                            nullable=False)

    op.execute('ALTER TYPE eventname RENAME TO tmp_eventname')
    old_type.create(op.get_bind())
    op.execute('ALTER TABLE events ALTER COLUMN event_name TYPE eventname USING event_name::text::eventname')
    op.execute('DROP TYPE tmp_eventname')
