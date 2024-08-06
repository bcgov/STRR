"""
Document response object.
"""
from pydantic import BaseModel

from strr_api import models


class Document(BaseModel):
    """Document response object."""

    registrationId: int
    documentId: int
    fileName: str
    fileType: str

    @classmethod
    def from_db(cls, source: models.Document):
        """Return a Document object from a database model."""
        return cls(
            registrationId=source.eligibility.registration_id,
            documentId=source.id,
            fileName=source.file_name,
            fileType=source.file_type,
        )
