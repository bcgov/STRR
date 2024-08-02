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
    application_id: Optional[int]
    registration_id: Optional[int]
    record: AutoApproval
    creation_date: datetime

    @classmethod
    def from_db(cls, source: models.AutoApprovalRecord):
        """Return an AutoApprovalRecord object from a database model."""
        return cls(
            id=source.id,
            application_id=source.application_id,
            registration_id=source.registration_id,
            record=AutoApproval(**source.record),
            creation_date=source.creation_date,
        )
