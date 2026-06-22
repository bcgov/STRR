"""
EventRecord response object.
"""
import json
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel

from strr_api.common.lookups import EVENT_MESSAGES
from strr_api.models import Events as EventsModel


class Events(BaseModel):
    """Events response object."""

    eventType: str
    eventName: str
    message: str
    createdDate: datetime
    details: Optional[str] = None
    structuredDetails: Optional[dict[str, Any] | list[Any]] = None
    idir: Optional[str] = None

    @staticmethod
    def _deserialize_structured_details(details: Optional[str]) -> Optional[dict[str, Any] | list[Any]]:
        """Parse details JSON when possible and return structured payloads only."""
        if details is None:
            return None

        try:
            parsed = json.loads(details)
            if isinstance(parsed, (dict, list)):
                return parsed
            return None
        except (json.JSONDecodeError, TypeError):
            return None

    @classmethod
    def from_db(cls, source: EventsModel):
        """Return an Events object from a database model."""
        return cls(
            eventType=source.event_type,
            eventName=source.event_name,
            message=EVENT_MESSAGES.get(source.event_name, ""),
            createdDate=source.created_date,
            details=source.details,
            structuredDetails=cls._deserialize_structured_details(source.details),
            idir=source.user.username if source.user else None,
        )
