"""
ORM Mapping for Event Records
"""
from __future__ import annotations

from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from strr_api.common.enum import BaseEnum, auto
from strr_api.models.base_model import BaseModel

from .db import db


class Events(BaseModel):
    """Events related to application, registration etc."""

    class EventType(BaseEnum):
        """Enum of event types."""

        APPLICATION = auto()  # pylint: disable=invalid-name
        REGISTRATION = auto()  # pylint: disable=invalid-name
        USER = auto()  # pylint: disable=invalid-name

    class EventName(BaseEnum):
        """Enum of event names."""

        APPLICATION_SUBMITTED = auto()
        INVOICE_GENERATED = auto()
        PAYMENT_COMPLETE = auto()
        PENDING_AUTO_APPROVAL_PROCESSING = auto()
        AUTO_APPROVAL_FULL_REVIEW = auto()
        AUTO_APPROVAL_PROVISIONAL = auto()
        AUTO_APPROVAL_APPROVED = auto()
        FULL_REVIEW_IN_PROGRESS = auto()
        MANUALLY_APPROVED = auto()
        MANUALLY_DENIED = auto()
        MORE_INFORMATION_REQUESTED = auto()
        REGISTRATION_CREATED = auto()
        CERTIFICATE_ISSUED = auto()
        EXPIRED = auto()
        NON_COMPLIANCE_SUSPENDED = auto()

    __tablename__ = "events"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    event_type = db.Column(db.Enum(EventType), nullable=False, index=True)
    event_name = db.Column(db.Enum(EventName), nullable=False)
    details = db.Column(db.String, nullable=True)
    created_date = db.Column(db.DateTime, nullable=False, server_default=text("(NOW())"))
    visible_to_applicant = db.Column(db.Boolean, nullable=False, server_default="false")
    registration_id = db.Column(db.Integer, db.ForeignKey("registrations.id"), nullable=True, index=True)
    application_id = db.Column(db.Integer, db.ForeignKey("application.id"), nullable=True, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    user = relationship("User")

    @classmethod
    def fetch_registration_events(cls, registration_id: int, applicant_visible_events_only: bool = True):
        """Get events for a given registration."""
        query = cls.query.filter_by(registration_id=registration_id)
        if applicant_visible_events_only:
            query = query.filter_by(visible_to_applicant=True)  # noqa
        return query.order_by(Events.created_date).all()

    @classmethod
    def fetch_application_events(cls, application_id: int, applicant_visible_events_only: bool = True):
        """Get events for a given application."""
        query = cls.query.filter_by(application_id=application_id)
        if applicant_visible_events_only:
            query = query.filter_by(visible_to_applicant=True)  # noqa
        return query.order_by(Events.created_date).all()
