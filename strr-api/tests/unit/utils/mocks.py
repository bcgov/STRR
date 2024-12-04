import json
import os

from strr_api.enums.enum import PaymentStatus, PropertyType, RegistrationStatus
from strr_api.exceptions import ExternalServiceException
from strr_api.models import Address, Application, Contact, Document, PropertyContact, Registration, RentalProperty, User

CREATE_REGISTRATION_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/host_registration.json"
)


def mock_json_file(filename):
    return os.path.join(os.path.dirname(os.path.realpath(__file__)), f"../../mocks/json/{filename}.json")


def disable_jwt_requires_auth(f):
    return f


def fake_get_token_auth_header(arg):
    return "fake_jwt_token"


def fake_user_from_token(arg):
    return User(
        firstname="First",
        lastname="last",
        email="test@test.test",
        idp_userid="ABCDEFG",
    )


def fake_examiner_from_token(arg):
    return User(
        firstname="First",
        lastname="last",
        email="test@test.test",
        idp_userid="ABCDEFG",
        login_source="IDIR",
    )


def fake_user_from_db(*args, **kwargs):
    return User(
        id=1,
        firstname="First",
        lastname="last",
        email="test@test.test",
        idp_userid="ABCDEFG",
    )


def fake_registration_pending(*args, **kwargs):
    return Registration(
        id=1,
        user_id=1,
        sbc_account_id=1000,
        status=RegistrationStatus.PENDING,
        updated_date="2021-01-01T00:00:00Z",
        rental_property=RentalProperty(
            id=1,
            property_type=PropertyType.SINGLE_FAMILY_HOME,
            ownership_type=RentalProperty.OwnershipType.OWN,
            registration_id=1,
            is_principal_residence=True,
            rental_act_accepted=True,
            address=Address(
                id=1,
                street_address="123 Fake St",
                country="CA",
                city="Victoria",
                province="BC",
                postal_code="V8V 8V8",
            ),
            contacts=[
                PropertyContact(
                    id=1,
                    is_primary=True,
                    property_id=1,
                    contact=Contact(
                        id=1,
                        firstname="First",
                        lastname="Last",
                        email="first.last@bc.gov.ca",
                        phone_number="123-456-7890",
                        date_of_birth="1970-01-01",
                        address=Address(
                            id=1,
                            street_address="123 Fake St",
                            country="CA",
                            city="Victoria",
                            province="BC",
                            postal_code="V8V 8V8",
                        ),
                    ),
                )
            ],
        ),
    )


def fake_application(ownership_type="rent", is_principal_residence=True, specified_service_provider=None):
    json_data = {
        "registration": {
            "primaryContact": {
                "name": {"firstName": "The", "middleName": "First", "lastName": "Guy"},
                "dateOfBirth": "1986-10-23",
                "details": {
                    "preferredName": "Mickey",
                    "phoneNumber": "604-999-9999",
                    "extension": "x64",
                    "faxNumber": "604-777-7777",
                    "emailAddress": "test@test.test",
                },
                "mailingAddress": {
                    "country": "CA",
                    "address": "12766 227st",
                    "addressLineTwo": "",
                    "city": "MAPLE RIDGE",
                    "province": "BC",
                    "postalCode": "V2X 6K6",
                },
            },
            "secondaryContact": {
                "name": {"firstName": "The", "middleName": "Other", "lastName": "Guy"},
                "dateOfBirth": "1986-10-23",
                "details": {
                    "preferredName": "Mouse",
                    "phoneNumber": "604-888-8888",
                    "extension": "",
                    "faxNumber": "",
                    "emailAddress": "test2@test.test",
                },
                "mailingAddress": {
                    "country": "CA",
                    "address": "12766 227st",
                    "addressLineTwo": "",
                    "city": "MAPLE RIDGE",
                    "province": "BC",
                    "postalCode": "V2X 6K6",
                },
            },
            "unitDetails": {
                "parcelIdentifier": "000-460-991",
                "businessLicense": "",
                "propertyType": "PRIMARY",
                "ownershipType": ownership_type,
            },
            "unitAddress": {
                "nickname": "My Rental Property",
                "country": "CA",
                "address": "12166 GREENWELL ST MAPLE RIDGE",
                "addressLineTwo": "",
                "city": "MAPLE RIDGE",
                "province": "BC",
                "postalCode": "V2X 7N1",
            },
            "listingDetails": [{"url": "https://www.airbnb.ca/rooms/26359027"}],
            "principalResidence": {
                "isPrincipalResidence": is_principal_residence,
                "agreedToRentalAct": True,
                "nonPrincipalOption": "n/a" if is_principal_residence else "OTHER",
                "specifiedServiceProvider": specified_service_provider,
                "agreedToSubmit": True,
            },
        },
    }

    return Application(application_json=json_data, type="registration", payment_account="123")


def fake_registration(*args, **kwargs):
    return Registration(
        id=1,
        user_id=1,
        sbc_account_id=1000,
        status=RegistrationStatus.ACTIVE,
        updated_date="2021-01-01T00:00:00Z",
        start_date="2024-07-29T00:00:00Z",
        expiry_date="2025-07-29T00:00:00Z",
        rental_property=RentalProperty(
            id=1,
            property_type=PropertyType.SINGLE_FAMILY_HOME,
            ownership_type=RentalProperty.OwnershipType.OWN,
            registration_id=1,
            is_principal_residence=True,
            rental_act_accepted=True,
            address=Address(
                id=1,
                street_address="123 Fake St",
                country="CA",
                city="Victoria",
                province="BC",
                postal_code="V8V 8V8",
            ),
            contacts=[
                PropertyContact(
                    id=1,
                    is_primary=True,
                    property_id=1,
                    contact=Contact(
                        id=1,
                        firstname="First",
                        lastname="Last",
                        email="first.last@bc.gov.ca",
                        phone_number="123-456-7890",
                        date_of_birth="1970-01-01",
                        address=Address(
                            id=1,
                            street_address="123 Fake St",
                            country="CA",
                            city="Victoria",
                            province="BC",
                            postal_code="V8V 8V8",
                        ),
                    ),
                )
            ],
        ),
    )


def fake_invoice_details(*args, **kwargs):
    return {"statusCode": "COMPLETED"}


def fake_document(*args, **kwargs):
    return Document(
        id=1,
        file_name="file_name",
        file_type="file_type",
        path="path",
        registration_id=1,
    )


def keycloak_profile_json(*args, **kwargs):
    return {"keycloakGuid": "ecb1ef8f2fee443eb14a414321bbc1f2"}


def new_sbc_account(*args, **kwargs):
    return {"id": 1}


def no_op(*args, **kwargs):
    None


def throw_external_service_exception(*args, **kwargs):
    raise ExternalServiceException("Test exception")


def empty_json(*args, **kwargs):
    return {}
