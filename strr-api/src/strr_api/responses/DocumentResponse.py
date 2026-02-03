"""
Document response object.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from strr_api import models


class Document(BaseModel):
    """Document response object."""

    registrationId: int
    documentId: int
    fileName: str
    fileType: str
    addedOn: Optional[datetime]

    @classmethod
    def from_db(cls, source: models.Document):
        """Return a Document object from a database model."""
        # Use added_on when set, otherwise document upload time from documents.created
        added_on = source.added_on if source.added_on is not None else getattr(source, "created", None)
        return cls(
            registrationId=source.eligibility.registration_id,
            documentId=source.id,
            fileName=source.file_name,
            fileType=source.file_type,
            addedOn=added_on,
        )
