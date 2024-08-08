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
    applicationId: int
    record: LtsaResponse
    creationDate: datetime

    @classmethod
    def from_db(cls, source: models.LTSARecord):
        """Return an LTSARecord object from a database model."""
        return cls(
            id=source.id,
            applicationId=source.application_id,
            record=LtsaResponse(**source.record),
            creationDate=source.creation_date,
        )
