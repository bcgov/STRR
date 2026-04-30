import base64
from datetime import datetime
from datetime import timezone
from http import HTTPStatus
import json

import pytest
import responses
from simple_cloudevent import SimpleCloudEvent
from simple_cloudevent import to_queue_message
from sqlalchemy import select
from strr_api.enums.enum import ChannelType
from strr_api.enums.enum import InteractionStatus
from strr_api.enums.enum import PropertyType
from strr_api.enums.enum import RegistrationNocStatus
from strr_api.enums.enum import RegistrationStatus
from strr_api.enums.enum import StrataHotelCategory
from strr_api.enums.enum import StrrRequirement
from strr_api.models import Address
from strr_api.models import Contact
from strr_api.models import CustomerInteraction
from strr_api.models import PropertyContact
from strr_api.models import Registration
from strr_api.models import RentalProperty
from strr_api.models import StrataHotel
from strr_api.models import StrataHotelRegistration
from strr_api.models import StrataHotelRepresentative
from strr_api.services import InteractionService
from strr_api.services.interaction import EmailInfo

CLOUD_EVENT = SimpleCloudEvent(
    id="fake-id",
    source="fake-for-tests",
    subject="fake-subject",
    type="email",
    data={
        "application_number": None,
        "email_type": "HOST_RENEWAL_REMINDER",
        "custom_content": None,
        "registration_number": "H1234567",
    },
)


@pytest.fixture(scope="function")
def simple_cloud_event():
    """Returns a simple cloud event."""

    def _generate(
        id="fake-id", source="fake-for-tests", subject="fake-subject", type="payment", data={}
    ):
        return SimpleCloudEvent(
            id=id,
            source=source,
            subject=subject,
            type=type,
            data=data,
        )

    return _generate


#
# This needs to mimic the envelope created by GCP PubSb when call a resource
#
CLOUD_EVENT_ENVELOPE = {
    "subscription": "projects/PUBSUB_PROJECT_ID/subscriptions/SUBSCRIPTION_ID",
    "message": {
        "data": base64.b64encode(to_queue_message(CLOUD_EVENT)).decode("UTF-8"),
        "messageId": "10",
        "attributes": {},
    },
    "id": 1,
}


@pytest.fixture(scope="function")
def queue_envelope():
    """Returns a queue envelope."""

    def _generate(
        pubsub_project_id: str = "PUBSUB_PROJECT_ID",
        subscription_id: str = "SUBSCRIPTION_ID",
        cloud_event=SimpleCloudEvent(),
        message_id: str = "10",
        attributes: dict = {},
        id: int = 1,
    ):
        return {
            "subscription": f"projects/{pubsub_project_id}/subscriptions/{subscription_id}",
            "message": {
                "data": base64.b64encode(to_queue_message(cloud_event)).decode("UTF-8"),
                "messageId": message_id,
                "attributes": attributes,
            },
            "id": id,
        }

    return _generate


def test_email_queue_nodata(client):
    """Empty post is just a no-op."""

    response = client.post("/")

    assert response.status_code == HTTPStatus.OK


def create_registration(session, setup_parents):
    """Create a bare bones registration.

    Uses: the return from the setup_parents fixture."""
    registration = setup_parents["registration"]
    session.add(registration)
    session.flush()

    contact1 = Contact(
        lastname="lastname",
        email="thor@daxiom.com",
    )
    contact2 = Contact(
        lastname="lastname",
        email="thor.wolpert@gov.bc.ca",
    )
    session.add(contact1, contact2)
    session.flush()
    # registration.rental_property.contacts
    address = Address(
        country="CA",
        street_address="street",
        city="Vancouver",
        province="BC",
        postal_code="H0H0H0",
    )
    session.add(address)
    session.flush()

    rp = RentalProperty(
        property_type=PropertyType.TOWN_HOME,
        is_principal_residence=True,
        rental_act_accepted=True,
        registration=registration,
        address=address,
    )
    session.add(rp)
    session.flush()

    pc1 = PropertyContact(
        is_primary=True,
        contact=contact1,
        # property=rp,
    )
    pc2 = PropertyContact(
        is_primary=False,
        contact=contact2,
        # property=rp,
    )
    # session.add(pc)
    rp.contacts.append(pc1)
    rp.contacts.append(pc2)
    session.add_all([pc1, pc2, rp])
    session.flush()

    registration.rental_property = rp

    session.add_all([registration])
    session.commit()
    return registration


def create_strata_hotel_registration(session, setup_parents):
    """Create a strata hotel registration with enough data to send email."""
    registration = setup_parents["registration"]
    registration.registration_type = Registration.RegistrationType.STRATA_HOTEL
    session.add(registration)
    session.flush()

    location = Address(
        country="CA",
        street_address="100 Strata Way",
        city="Vancouver",
        province="BC",
        postal_code="V6B1A1",
    )
    mailing_address = Address(
        country="CA",
        street_address="200 Mailing Way",
        city="Vancouver",
        province="BC",
        postal_code="V6B2B2",
    )
    representative_contact = Contact(lastname="Representative", email="strata.rep@gov.bc.ca")
    session.add_all([location, mailing_address, representative_contact])
    session.flush()

    strata_hotel = StrataHotel(
        legal_name="Test Strata Hotel",
        home_jurisdiction="BC",
        brand_name="Test Brand",
        website="https://example.com",
        number_of_units=10,
        category=StrataHotelCategory.FULL_SERVICE,
        mailingAddress=mailing_address,
        location=location,
    )
    strata_hotel.representatives.append(StrataHotelRepresentative(contact=representative_contact))
    registration.strata_hotel_registration = StrataHotelRegistration(strata_hotel=strata_hotel)
    session.add(registration)
    session.commit()
    return registration


def token_callback(request):
    """Response callback, for the bearer token call."""
    token = {"access_token": "my-token"}
    return (200, {}, json.dump(token))


@pytest.mark.conf(
    KEYCLOAK_AUTH_TOKEN_URL="http://my-auth-url",
    NOTIFY_SVC_URL="http://my-notify-mock",
    NOTIFY_API_TIMEOUT=30,
    EMAIL_HOUSING_RECIPIENT_EMAIL="remove@gov.bc.ca",
)
@responses.activate
def test_email_mocked_notify(
    app,
    client,
    session,
    simple_cloud_event,
    queue_envelope,
    setup_parents,
    random_integer,
    inject_config,
):
    """Test email service using a mocked notify service to create an Interaction record."""

    # Callback
    def notify_callback(request):
        """Return the callback struct that comes from notify."""
        payload = json.loads(request.body)
        response = {
            "content": {
                "id": random_integer(6),
                "subject": payload.get("content", {}).get("subject"),
            },
            "id": random_integer(6),
            "notifyProvider": "HOUSING",
            "notifyStatus": "QUEUED",
            "notifyType": "EMAIL",
            "recipients": payload.get("recipients").removeprefix(
                app.config.get("EMAIL_HOUSING_RECIPIENT_EMAIL") + ","
            ),
            "requestBy": "STRR",
            "requestDate": datetime.now(timezone.utc).isoformat(),
            "sentDate": datetime.now(timezone.utc).isoformat(),
        }

        return (200, {}, json.dumps(response))

    # Register mocks
    KEYCLOAK_AUTH_TOKEN_URL = app.config.get("KEYCLOAK_AUTH_TOKEN_URL")
    responses.add(responses.POST, KEYCLOAK_AUTH_TOKEN_URL, json={"access_token": "123"}, status=200)
    responses.add_callback(
        responses.POST,
        app.config.get("NOTIFY_SVC_URL"),
        callback=notify_callback,
        content_type="application/json",
    )

    # Create a registration with enough info to email out.
    registration = create_registration(session, setup_parents)

    # Create a CustomerInteraction
    email_info = EmailInfo(
        email_type="HOST_RENEWAL_REMINDER",
        registration_number=registration.registration_number,
    )
    interaction_uuid = InteractionService.queued(
        channel_type=ChannelType.EMAIL,
        payload=email_info,
        registration_id=registration.id,
    )

    # Create the CE to send to the worker endpoint.
    data = {
        "application_number": None,
        "email_type": "HOST_RENEWAL_REMINDER",
        "custom_content": None,
        "registration_number": registration.registration_number,
        "interaction_uuid": interaction_uuid,
    }
    ce = simple_cloud_event(data=data)
    envelope = queue_envelope(cloud_event=ce)

    # the test
    response = client.post("/", json=envelope)

    # check completed
    assert response.status_code == HTTPStatus.OK

    json_data = response.get_json()
    interaction_uuid = json_data.get("interaction", None)

    # check the Interaction record
    stored = session.scalar(
        select(CustomerInteraction).where(CustomerInteraction.interaction_uuid == interaction_uuid)
    )

    assert stored.notify_reference
    assert stored.registration_id == registration.id
    assert stored.status == InteractionStatus.SENT


@pytest.mark.conf(
    KEYCLOAK_AUTH_TOKEN_URL="http://my-auth-url",
    NOTIFY_SVC_URL="http://my-notify-mock",
    NOTIFY_API_TIMEOUT=30,
    EMAIL_HOUSING_RECIPIENT_EMAIL="remove@gov.bc.ca",
    EMAIL_SUBJECT_PREFIX="[TEST]",
)
@responses.activate
def test_strata_hotel_registration_active_email_posts_to_notify(
    app,
    client,
    session,
    simple_cloud_event,
    queue_envelope,
    setup_parents,
    inject_config,
):
    """Test that strata hotel active registration emails are sent to Notify."""
    notify_payloads = []

    def notify_callback(request):
        payload = json.loads(request.body)
        notify_payloads.append(payload)
        return (200, {}, json.dumps({"id": "notify-id"}))

    responses.add(
        responses.POST,
        app.config.get("KEYCLOAK_AUTH_TOKEN_URL"),
        json={"access_token": "123"},
        status=200,
    )
    responses.add_callback(
        responses.POST,
        app.config.get("NOTIFY_SVC_URL"),
        callback=notify_callback,
        content_type="application/json",
    )

    registration = create_strata_hotel_registration(session, setup_parents)
    ce = simple_cloud_event(
        data={
            "registration_number": registration.registration_number,
            "email_type": "STRATA_HOTEL_REGISTRATION_ACTIVE",
            "custom_content": "Approval condition",
        }
    )

    response = client.post("/", json=queue_envelope(cloud_event=ce))

    assert response.status_code == HTTPStatus.OK
    assert notify_payloads[0]["recipients"] == "remove@gov.bc.ca,strata.rep@gov.bc.ca"
    assert notify_payloads[0]["content"]["subject"] == (
        f"[TEST] {registration.registration_number} - Short-Term Rental Registration Approved"
    )
    assert "Approval condition" in notify_payloads[0]["content"]["body"]
