"""empty message

Revision ID: c8d5441975d9
Revises: d9213a367092
Create Date: 2024-09-27 13:13:31.168090

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'c8d5441975d9'
down_revision = 'd9213a367092'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    registrationstatus = postgresql.ENUM('ACTIVE', 'EXPIRED', 'SUSPENDED', name='registrationstatus')
    registrationstatus.create(op.get_bind(), checkfirst=True)

    propertytype = postgresql.ENUM('PRIMARY', 'SECONDARY', 'ACCESSORY', 'FLOAT_HOME', 'OTHER', name='propertytype')
    propertytype.create(op.get_bind(), checkfirst=True)

    ownershiptype = postgresql.ENUM('OWN', 'RENT', 'CO_OWN', name='ownershiptype')
    ownershiptype.create(op.get_bind(), checkfirst=True)

    op.create_table('platforms',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('legal_name', sa.String(), nullable=False),
    sa.Column('business_number', sa.String(), nullable=False),
    sa.Column('registration_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['registration_id'], ['registrations.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('property_contacts',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('is_primary', sa.Boolean(), nullable=False),
    sa.Column('contact_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('property_listings',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('platform', sa.String(), nullable=True),
    sa.Column('url', sa.String(), nullable=False),
    sa.Column('type', sa.String(), nullable=True),
    sa.Column('property_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['property_id'], ['rental_properties.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('documents', schema=None) as batch_op:
        batch_op.drop_constraint('documents_eligibility_id_fkey', type_='foreignkey')
        batch_op.drop_column('eligibility_id')

    with op.batch_alter_table('registrations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('registration_type', sa.String(), nullable=True))
        batch_op.alter_column('sbc_account_id',
               existing_type=sa.INTEGER(),
               nullable=False)
        batch_op.alter_column('status',
               existing_type=sa.VARCHAR(),
               type_=registrationstatus,
               nullable=False,
               existing_nullable=False,
               postgresql_using="status::registrationstatus")
        batch_op.alter_column('start_date',
               existing_type=postgresql.TIMESTAMP(timezone=True),
               type_=sa.DateTime(),
               nullable=False)
        batch_op.alter_column('expiry_date',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)
        batch_op.drop_index('ix_registrations_submission_date')
        batch_op.create_index(batch_op.f('ix_registrations_registration_type'), ['registration_type'], unique=False)
        batch_op.create_index(batch_op.f('ix_registrations_sbc_account_id'), ['sbc_account_id'], unique=False)
        batch_op.drop_constraint('registrations_rental_property_id_fkey', type_='foreignkey')
        batch_op.drop_column('rental_property_id')
        batch_op.drop_column('submission_date')

    with op.batch_alter_table('rental_properties', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_principal_residence', sa.Boolean(), nullable=False))
        batch_op.add_column(sa.Column('rental_act_accepted', sa.Boolean(), nullable=False))
        batch_op.add_column(sa.Column('pr_exempt_reason', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('service_provider', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('registration_id', sa.Integer(), nullable=False))
        batch_op.alter_column('property_type',
               existing_type=sa.VARCHAR(),
               type_=propertytype,
               existing_nullable=False,
               postgresql_using="property_type::propertytype")
        batch_op.alter_column('ownership_type',
               existing_type=sa.VARCHAR(),
               type_=ownershiptype,
               existing_nullable=False,
               postgresql_using="ownership_type::ownershiptype")
        batch_op.drop_constraint('rental_properties_property_manager_id_fkey', type_='foreignkey')
        batch_op.create_foreign_key(None, 'registrations', ['registration_id'], ['id'])
        batch_op.drop_column('property_manager_id')

    op.drop_table('eligibilities')
    op.drop_table('rental_platforms')
    op.drop_table('property_managers')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    registrationstatus = postgresql.ENUM('ACTIVE', 'EXPIRED', 'SUSPENDED', name='registrationstatus')
    registrationstatus.create(op.get_bind(), checkfirst=True)

    propertytype = postgresql.ENUM('PRIMARY', 'SECONDARY', 'ACCESSORY', 'FLOAT_HOME', 'OTHER', name='propertytype')
    propertytype.create(op.get_bind(), checkfirst=True)

    ownershiptype = postgresql.ENUM('OWN', 'RENT', 'CO_OWN', name='ownershiptype')
    ownershiptype.create(op.get_bind(), checkfirst=True)

    op.create_table('property_managers',
    sa.Column('id', sa.INTEGER(), server_default=sa.text("nextval('property_managers_id_seq'::regclass)"), autoincrement=True, nullable=False),
    sa.Column('primary_contact_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('secondary_contact_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['primary_contact_id'], ['contacts.id'], name='property_managers_primary_contact_id_fkey'),
    sa.ForeignKeyConstraint(['secondary_contact_id'], ['contacts.id'], name='property_managers_secondary_contact_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='property_managers_pkey'),postgresql_ignore_search_path=False
    )
    op.create_table('rental_platforms',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('name', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.Column('property_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('url', sa.VARCHAR(), autoincrement=False, nullable=False),
    sa.Column('type', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['property_id'], ['rental_properties.id'], name='rental_platforms_property_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='rental_platforms_pkey')
    )
    op.create_table('eligibilities',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('registration_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('is_principal_residence', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('agreed_to_rental_act', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('non_principal_option', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.Column('specified_service_provider', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.Column('agreed_to_submit', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['registration_id'], ['registrations.id'], name='eligibilities_registration_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='eligibilities_pkey')
    )
    with op.batch_alter_table('rental_properties', schema=None) as batch_op:
        batch_op.add_column(sa.Column('property_manager_id', sa.INTEGER(), autoincrement=False, nullable=False))
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.create_foreign_key('rental_properties_property_manager_id_fkey', 'property_managers', ['property_manager_id'], ['id'])
        batch_op.alter_column('ownership_type',
               existing_type=ownershiptype,
               type_=sa.VARCHAR(),
               existing_nullable=False,
               postgresql_using="ownership_type::VARCHAR")
        batch_op.alter_column('property_type',
               existing_type=propertytype,
               type_=sa.VARCHAR(),
               existing_nullable=False,
               postgresql_using="property_type::VARCHAR")
        batch_op.drop_column('registration_id')
        batch_op.drop_column('service_provider')
        batch_op.drop_column('pr_exempt_reason')
        batch_op.drop_column('rental_act_accepted')
        batch_op.drop_column('is_principal_residence')

    with op.batch_alter_table('registrations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('submission_date', postgresql.TIMESTAMP(), autoincrement=False, nullable=False))
        batch_op.add_column(sa.Column('rental_property_id', sa.INTEGER(), autoincrement=False, nullable=False))
        batch_op.create_foreign_key('registrations_rental_property_id_fkey', 'rental_properties', ['rental_property_id'], ['id'])
        batch_op.drop_index(batch_op.f('ix_registrations_sbc_account_id'))
        batch_op.drop_index(batch_op.f('ix_registrations_registration_type'))
        batch_op.create_index('ix_registrations_submission_date', ['submission_date'], unique=False)
        batch_op.alter_column('expiry_date',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
        batch_op.alter_column('start_date',
               existing_type=sa.DateTime(),
               type_=postgresql.TIMESTAMP(timezone=True),
               nullable=True)
        batch_op.alter_column('status',
               existing_type=registrationstatus,
               type_=sa.VARCHAR(),
               existing_nullable=False,
               postgresql_using="status::VARCHAR")
        batch_op.alter_column('sbc_account_id',
               existing_type=sa.INTEGER(),
               nullable=True)
        batch_op.drop_column('registration_type')

    with op.batch_alter_table('documents', schema=None) as batch_op:
        batch_op.add_column(sa.Column('eligibility_id', sa.INTEGER(), autoincrement=False, nullable=False))
        batch_op.create_foreign_key('documents_eligibility_id_fkey', 'eligibilities', ['eligibility_id'], ['id'])

    op.drop_table('property_listings')
    op.drop_table('property_contacts')
    op.drop_table('platforms')
    op.execute("DROP TYPE IF EXISTS registrationstatus;")
    op.execute("DROP TYPE IF EXISTS propertytype;")
    op.execute("DROP TYPE IF EXISTS ownershiptype;")
    # ### end Alembic commands ###