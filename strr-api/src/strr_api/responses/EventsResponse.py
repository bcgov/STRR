"""
EventRecord response object.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from strr_api.common.lookups import EVENT_MESSAGES
from strr_api.models import Events as EventsModel


class Events(BaseModel):
    """Events response object."""

    eventType: str
    eventName: str
    message: str
    createdDate: datetime
    details: Optional[str]
    idir: Optional[str]

    @classmethod
    def from_db(cls, source: EventsModel):
        """Return an Events object from a database model."""
        return cls(
            eventType=source.event_type,
            eventName=source.event_name,
            message=EVENT_MESSAGES.get(source.event_name, ""),
            createdDate=source.created_date,
            details=source.details,
            idir=source.user.username if source.user else None,
        )
