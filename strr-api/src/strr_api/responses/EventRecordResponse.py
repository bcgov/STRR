"""
EventRecord response object.
"""
from datetime import datetime

from pydantic import BaseModel

from strr_api.common.lookups import EVENT_MESSAGES
from strr_api.models import Events


class EventRecord(BaseModel):
    """EventRecord response object."""

    event_type: str
    event_name: str
    message: str
    created_date: datetime

    @classmethod
    def from_db(cls, source: Events):
        """Return an EventRecord object from a database model."""
        return cls(
            event_type=source.event_type,
            event_name=source.event_name,
            message=EVENT_MESSAGES.get(source.event_name, ""),
            created_date=source.created_date,
        )
