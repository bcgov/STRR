"""
Auto Approval response objects.
"""
from typing import Optional

from pydantic import BaseModel


class AutoApproval(BaseModel):
    """Auto approval response object."""

    renting: Optional[bool] = None
    serviceProvider: Optional[bool] = None
    businessLicenseRequired: Optional[bool] = None
    businessLicenseProvided: Optional[bool] = None
    prExempt: Optional[bool] = None
    strProhibited: Optional[bool] = None
    organizationNm: Optional[str] = None
    titleCheck: Optional[bool] = None
    addressMatch: Optional[bool] = None
    suggestedAction: Optional[str] = None
