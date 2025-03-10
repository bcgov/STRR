"""empty message

Revision ID: 22475f77d58a
Revises: 842bb132abc7
Create Date: 2025-02-19 16:08:57.190592

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '22475f77d58a'
down_revision = '842bb132abc7'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS anon CASCADE;")
    op.execute("SELECT anon.init();")

    security_labels = [
        ("addresses.country", "anon.fake_country()"),
        ("addresses.street_address", "anon.fake_address()"),
        ("addresses.city", "anon.fake_city()"),
        ("addresses.province", "anon.random_string(5)"),
        ("addresses.postal_code", "anon.fake_postcode()"),
        ("addresses.street_address_additional", "anon.fake_address()"),
        ("addresses.location_description", "anon.random_string(10)"),
        ("addresses.unit_number", "anon.random_int_between(1000,10000)"),
        ("addresses.street_number", "anon.random_int_between(1000,10000)"),
        ("addresses_history.country", "anon.fake_country()"),
        ("addresses_history.street_address", "anon.fake_address()"),
        ("addresses_history.city", "anon.fake_city()"),
        ("addresses_history.province", "anon.random_string(5)"),
        ("addresses_history.postal_code", "anon.fake_postcode()"),
        ("addresses_history.street_address_additional", "anon.fake_address()"),
        ("addresses_history.location_description", "anon.random_string(10)"),
        ("addresses_history.unit_number", "anon.random_int_between(1000,10000)"),
        ("addresses_history.street_number", "anon.random_int_between(1000,10000)"),
        ("application.payment_account", "anon.random_int_between(1000,10000)"),
        ("contacts.firstname", "anon.fake_first_name()"),
        ("contacts.lastname", "anon.fake_last_name()"),
        ("contacts.middlename", "anon.fake_first_name()"),
        ("contacts.preferredname", "anon.fake_first_name()"),
        ("contacts.email", "anon.fake_email()"),
        ("contacts.phone_number", "anon.random_phone()"),
        ("contacts.phone_extension", "anon.random_phone()"),
        ("contacts.fax_number", "anon.random_phone()"),
        ("contacts.date_of_birth", "anon.random_date()"),
        ("contacts.social_insurance_number", "anon.random_int_between(1000,10000)"),
        ("contacts.business_number", "anon.random_int_between(1000,10000)"),
        ("contacts.job_title", "anon.random_string(8)"),
        ("contacts_history.firstname", "anon.fake_first_name()"),
        ("contacts_history.lastname", "anon.fake_last_name()"),
        ("contacts_history.middlename", "anon.fake_first_name()"),
        ("contacts_history.preferredname", "anon.fake_first_name()"),
        ("contacts_history.email", "anon.fake_email()"),
        ("contacts_history.phone_number", "anon.random_phone()"),
        ("contacts_history.phone_extension", "anon.random_phone()"),
        ("contacts_history.fax_number", "anon.random_phone()"),
        ("contacts_history.date_of_birth", "anon.random_date()"),
        ("contacts_history.social_insurance_number", "anon.random_int_between(1000,10000)"),
        ("contacts_history.business_number", "anon.random_int_between(1000,10000)"),
        ("contacts_history.job_title", "anon.random_string(8)"),
        ("users.username", "anon.random_string(6)"),
        ("users.firstname", "anon.fake_first_name()"),
        ("users.lastname", "anon.fake_last_name()"),
        ("users.middlename", "anon.fake_first_name()"),
        ("users.email", "anon.fake_email()"),
        ("platforms.legal_name", "anon.random_string(6)"),
        ("platforms.business_number", "anon.random_int_between(1000,10000)"),
        ("platforms.cpbc_licence_number", "anon.random_int_between(1000,10000)"),
        ("platforms.attorney_name", "anon.fake_last_name()"),
        ("platforms.home_jurisdiction", "anon.fake_country()"),
        ("platforms_history.legal_name", "anon.random_string(6)"),
        ("platforms_history.business_number", "anon.random_int_between(1000,10000)"),
        ("platforms_history.cpbc_licence_number", "anon.random_int_between(1000,10000)"),
        ("platforms_history.attorney_name", "anon.fake_last_name()"),
        ("platforms_history.home_jurisdiction", "anon.fake_country()"),
        ("property_manager.business_legal_name", "anon.random_string(8)"),
        ("property_manager.business_number", "anon.random_int_between(1000,10000)"),
        ("property_manager_history.business_legal_name", "anon.random_string(8)"),
        ("property_manager_history.business_number", "anon.random_int_between(1000,10000)"),
        ("strata_hotels.legal_name", "anon.random_string(6)"),
        ("strata_hotels.home_jurisdiction", "anon.fake_country()"),
        ("strata_hotels.business_number", "anon.random_int_between(1000,10000)"),
        ("strata_hotels.attorney_name", "anon.fake_last_name()"),
        ("strata_hotels.brand_name", "anon.random_string(6)"),
        ("strata_hotels_history.legal_name", "anon.random_string(6)"),
        ("strata_hotels_history.home_jurisdiction", "anon.fake_country()"),
        ("strata_hotels_history.business_number", "anon.random_int_between(1000,10000)"),
        ("strata_hotels_history.attorney_name", "anon.fake_last_name()"),
        ("strata_hotels_history.brand_name", "anon.random_string(6)"),
        ("registrations.registration_number", "anon.random_int_between(1000,10000)"),
        ("registrations_history.registration_number", "anon.random_int_between(1000,10000)"),
        ("rental_properties.nickname", "anon.random_string(6)"),
        ("rental_properties.parcel_identifier", "anon.random_int_between(1000,10000)"),
        ("rental_properties.local_business_licence", "anon.random_int_between(1000,10000)"),
        ("rental_properties.pr_exempt_reason", "anon.random_string(10)"),
        ("rental_properties.service_provider", "anon.random_string(8)"),
        ("rental_properties.strata_hotel_registration_number", "anon.random_int_between(1000,10000)")
    ]

    for column, function in security_labels:
        op.execute(f"SECURITY LABEL FOR anon ON COLUMN {column} IS 'MASKED WITH FUNCTION {function}';")


def downgrade():
    op.execute("SELECT anon.remove_masks_for_all_columns();")
