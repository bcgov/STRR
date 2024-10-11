"""
LTSARecord response object.
"""
from datetime import datetime

from pydantic import BaseModel

from strr_api import models
from strr_api.responses import LtsaResponse


class LTSARecord(BaseModel):
    """LTSARecord response object."""

    id: int
    applicationNumber: str
    record: LtsaResponse
    creationDate: datetime

    @classmethod
    def from_db(cls, source: models.LTSARecord):
        """Return an LTSARecord object from a database model."""
        application = models.Application.find_by_id(source.application_id)
        return cls(
            id=source.id,
            applicationNumber=application.application_number if application else None,
            record=LtsaResponse(**source.record),
            creationDate=source.creation_date,
        )
