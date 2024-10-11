"""
AutoApprovalRecord response object.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from strr_api import models
from strr_api.responses import AutoApproval


class AutoApprovalRecord(BaseModel):
    """AutoApprovalRecord response object."""

    id: int
    applicationNumber: str
    record: AutoApproval
    creationDate: datetime

    @classmethod
    def from_db(cls, source: models.AutoApprovalRecord):
        """Return an AutoApprovalRecord object from a database model."""
        application = models.Application.find_by_id(source.application_id)
        return cls(
            id=source.id,
            applicationNumber=application.application_number if application else None,
            record=AutoApproval(**source.record),
            creationDate=source.creation_date,
        )
