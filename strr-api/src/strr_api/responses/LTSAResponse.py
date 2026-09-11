"""
LTSA response objects.
"""

from typing import List

from pydantic import BaseModel, ConfigDict


class TitleSummary(BaseModel):
    """LTSA TitleSummary response object."""

    titleNumber: str
    landTitleDistrict: str
    landTitleDistrictCode: str
    parcelIdentifier: str
    status: str
    firstOwner: str


class TitleSummaries(BaseModel):
    """LTSA TitleSummaries response object."""

    titleSummaries: List[TitleSummary]


class TitleIdentifier(BaseModel):
    """LTSA TitleIdentifier response object."""

    titleNumber: str
    landTitleDistrict: str


class FromTitle(BaseModel):
    """LTSA FromTitle response object."""

    titleNumber: str
    landTitleDistrict: str


class NatureOfTransfer(BaseModel):
    """LTSA NatureOfTransfer response object."""

    transferReason: str


class Tombstone(BaseModel):
    """LTSA Tombstone response object."""

    applicationReceivedDate: str
    enteredDate: str
    titleRemarks: str
    marketValueAmount: str
    fromTitles: List[FromTitle]
    natureOfTransfers: List[NatureOfTransfer]


class Address(BaseModel):
    """LTSA Address response object."""

    addressLine1: str
    addressLine2: str
    city: str
    province: str
    provinceName: str
    country: str
    postalCode: str


class TitleOwner(BaseModel):
    """LTSA TitleOwner response object."""

    lastNameOrCorpName1: str
    givenName: str
    incorporationNumber: str
    occupationDescription: str
    address: Address


class TaxAuthority(BaseModel):
    """LTSA TaxAuthority response object."""

    authorityName: str


class OwnershipGroup(BaseModel):
    """LTSA OwnershipGroup response object."""

    jointTenancyIndication: bool
    interestFractionNumerator: str
    interestFractionDenominator: str
    ownershipRemarks: str
    titleOwners: List[TitleOwner]


class DescriptionOfLand(BaseModel):
    """LTSA DescriptionOfLand response object"""

    parcelIdentifier: str
    fullLegalDescription: str
    parcelStatus: str


# @dataclass(config=ConfigDict(extra="ignore"))
class LtsaResponse(BaseModel):
    """LTSA Reference endpoint response object."""

    titleStatus: str
    titleIdentifier: TitleIdentifier
    tombstone: Tombstone
    taxAuthorities: List[TaxAuthority]
    ownershipGroups: List[OwnershipGroup]
    descriptionsOfLand: List[DescriptionOfLand]

    __pydantic_config__ = ConfigDict(extra="ignore")
