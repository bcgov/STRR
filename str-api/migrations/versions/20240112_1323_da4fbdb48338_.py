"""empty message

Revision ID: da4fbdb48338
Revises: 4ce87b7566ff
Create Date: 2024-01-12 13:23:45.377701

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'da4fbdb48338'
down_revision = '4ce87b7566ff'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('ownership_details', schema=None) as batch_op:
        batch_op.drop_index('ix_ownership_details_business_identifier')

    op.drop_table('ownership_details')

    with op.batch_alter_table('persons', schema=None) as batch_op:
        batch_op.drop_index('ix_persons_full_name')

    op.drop_table('persons')
    # ### end Alembic commands ###


def downgrade():
    op.create_table('persons',
    sa.Column('uuid', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('full_name', sa.VARCHAR(length=300), autoincrement=False, nullable=True),
    sa.Column('family_name', sa.VARCHAR(length=100), autoincrement=False, nullable=True),
    sa.Column('given_name', sa.VARCHAR(length=100), autoincrement=False, nullable=True),
    sa.Column('patronymic_name', sa.VARCHAR(length=100), autoincrement=False, nullable=True),
    sa.Column('is_permanent_resident', sa.BOOLEAN(), autoincrement=False, nullable=True),
    sa.Column('is_canadian_citizen', sa.BOOLEAN(), autoincrement=False, nullable=True),
    sa.Column('is_canadian_tax_resident', sa.BOOLEAN(), autoincrement=False, nullable=True),
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('created_by', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('updated_by', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=True),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('preferred_name', sa.VARCHAR(length=300), autoincrement=False, nullable=True),
    sa.Column('birth_date', sa.DATE(), autoincrement=False, nullable=True),
    sa.Column('email', sa.VARCHAR(length=150), autoincrement=False, nullable=True),
    sa.Column('citizenships_ex_ca', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True),
    sa.Column('tax_number', sa.VARCHAR(length=150), autoincrement=False, nullable=True),
    sa.Column('competency', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True),
    sa.Column('address', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True),
    sa.PrimaryKeyConstraint('id', name='persons_pkey')
    )
    with op.batch_alter_table('persons', schema=None) as batch_op:
        batch_op.create_index('ix_persons_full_name', ['full_name'], unique=False)

    op.create_table('ownership_details',
    sa.Column('business_identifier', sa.VARCHAR(length=300), autoincrement=False, nullable=False),
    sa.Column('person_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('created_by', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('updated_by', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=True),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('uuid', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('percent_of_shares', sa.REAL(), autoincrement=False, nullable=True),
    sa.Column('percent_of_votes', sa.REAL(), autoincrement=False, nullable=True),
    sa.Column('missing_info_reason', sa.VARCHAR(length=2000), autoincrement=False, nullable=True),
    sa.Column('start_date', sa.DATE(), autoincrement=False, nullable=False),
    sa.Column('end_date', sa.DATE(), autoincrement=False, nullable=True),
    sa.Column('submission_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('control_type', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['person_id'], ['persons.id'], name='ownership_details_person_id_fkey'),
    sa.ForeignKeyConstraint(['submission_id'], ['submission.id'], name='ownership_details_submission_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='ownership_details_pkey')
    )
    with op.batch_alter_table('ownership_details', schema=None) as batch_op:
        batch_op.create_index('ix_ownership_details_business_identifier', ['business_identifier'], unique=False)


    # ### end Alembic commands ###
