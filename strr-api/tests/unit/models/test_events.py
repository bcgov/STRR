import pytest

from strr_api.models.events import Events
from strr_api.models.user import User

from .test_user import sample_user


def test_renewal_reminder_event(client, session, sample_user):
    """Simple test to check event type.

    TODO: expand to check all event types / enum / DB
    """
    event = Events(
        event_type=Events.EventType.REGISTRATION,
        event_name=Events.EventName.RENEWAL_REMINDER_SENT,
        details="final",
        # registration_id = db.Column(db.Integer, db.ForeignKey("registrations.id"), nullable=True, index=True)
        # application_id = db.Column(db.Integer, db.ForeignKey("application.id"), nullable=True, index=True)
        # user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    )
    session.add(event)
    session.commit()

    # Ensure it was saved to the DB
    assert event.id

    # Fetch (legacy style) from the DB
    event_id = event.id
    event_db = Events.query.filter_by(id=event_id).one_or_none()

    # Ensure it got the correct event_name
    assert event_db.event_name is Events.EventName.RENEWAL_REMINDER_SENT
