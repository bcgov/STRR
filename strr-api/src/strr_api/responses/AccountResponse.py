"""
SBC Account response objects.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from strr_api import models


class Account(BaseModel):
    """Account response object."""

    user_id: int
    username: Optional[str] = None
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    middlename: Optional[str] = None
    email: Optional[str] = None
    sub: Optional[str] = None
    iss: Optional[str] = None
    idp_userid: Optional[str] = None
    login_source: Optional[str] = None
    creation_date: Optional[datetime] = None

    @classmethod
    def from_db(cls, source: models.User):
        """Return a User Account object from a database model."""
        return cls(
            user_id=source.id,
            username=source.username,
            firstname=source.firstname,
            lastname=source.lastname,
            middlename=source.middlename,
            email=source.email,
            sub=source.sub,
            iss=source.iss,
            idp_userid=source.idp_userid,
            login_source=source.login_source,
            creation_date=source.creation_date,
        )
