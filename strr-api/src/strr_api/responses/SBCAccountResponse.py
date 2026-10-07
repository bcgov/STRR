"""
SBC Account response objects.
"""

from typing import Optional

from pydantic import BaseModel


class SBCMailingAddress(BaseModel):
    """SBCMailingAddress response object."""

    street: str
    streetAdditional: Optional[str] = None
    city: str
    region: str
    postalCode: str
    country: str


class SBCAccount(BaseModel):
    """SBCAccount response object."""

    user_id: int
    sbc_account_id: int
