"""
Registration response objects.
"""
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel

from strr_api import models


class PrincipalResidence(BaseModel):
    """PrincipalResidence response object."""

    isPrincipalResidence: bool
    agreedToRentalAct: bool
    agreedToSubmit: bool
    nonPrincipalOption: Optional[str] = None
    specifiedServiceProvider: Optional[str] = None


class ListingDetails(BaseModel):
    """ListingDetails response object."""

    url: str


class UnitDetails(BaseModel):
    """UnitDetails response object."""

    parcelIdentifier: Optional[str] = None
    businessLicense: Optional[str] = None
    propertyType: str
    ownershipType: str


class MailingAddress(BaseModel):
    """MailingAddress response object."""

    address: str
    addressLineTwo: Optional[str] = None
    city: str
    postalCode: str
    province: str
    country: str


class UnitAddress(MailingAddress):
    """UnitAddress response object."""

    nickname: Optional[str] = None

    def __init__(self, address_dict, nickname: Optional[str] = None):
        super().__init__(**address_dict)
        self.nickname = nickname


class ContactName(BaseModel):
    """ContactName response object."""

    firstName: str
    middleName: Optional[str] = None
    lastName: str


class ContactDetails(BaseModel):
    """ContactDetails response object."""

    preferredName: Optional[str] = None
    phoneNumber: str
    extension: Optional[str] = None
    faxNumber: Optional[str] = None
    emailAddress: Optional[str] = None


class Contact(BaseModel):
    """Contact response object."""

    name: ContactName
    dateOfBirth: date
    socialInsuranceNumber: Optional[str] = None
    businessNumber: Optional[str] = None
    details: ContactDetails
    mailingAddress: MailingAddress


class Registration(BaseModel):
    """Registration response object."""

    id: int
    user_id: int
    sbc_account_id: Optional[int] = None
    submissionDate: datetime
    updatedDate: datetime
    startDate: Optional[datetime]
    expiryDate: Optional[datetime]
    status: str
    registration_number: Optional[str] = None
    primaryContact: Contact
    secondaryContact: Optional[Contact] = None
    unitAddress: UnitAddress
    unitDetails: UnitDetails
    listingDetails: List[ListingDetails]
    principalResidence: PrincipalResidence

    @classmethod
    def from_db(cls, source: models.Registration):
        """Return a Registration object from a database model."""
        latest_certificate = None
        for certificate in source.certificates:
            if latest_certificate is None or certificate.issued_date > latest_certificate.issued_date:
                latest_certificate = certificate

        registration_number = source.registration_number

        return cls(
            id=source.id,
            user_id=source.user_id,
            sbc_account_id=source.sbc_account_id,
            submissionDate=source.submission_date,
            updatedDate=source.updated_date,
            startDate=source.start_date if source.start_date else None,
            expiryDate=source.expiry_date if source.expiry_date else None,
            status=source.status.name,
            registration_number=registration_number,
            primaryContact=Contact(
                name=ContactName(
                    firstName=source.rental_property.property_manager.primary_contact.firstname,
                    middleName=source.rental_property.property_manager.primary_contact.middlename,
                    lastName=source.rental_property.property_manager.primary_contact.lastname,
                ),
                dateOfBirth=source.rental_property.property_manager.primary_contact.date_of_birth,
                socialInsuranceNumber=source.rental_property.property_manager.primary_contact.social_insurance_number,
                businessNumber=source.rental_property.property_manager.primary_contact.business_number,
                details=ContactDetails(
                    preferredName=source.rental_property.property_manager.primary_contact.preferredname,
                    phoneNumber=source.rental_property.property_manager.primary_contact.phone_number,
                    extension=source.rental_property.property_manager.primary_contact.phone_extension,
                    faxNumber=source.rental_property.property_manager.primary_contact.fax_number,
                    emailAddress=source.rental_property.property_manager.primary_contact.email,
                ),
                mailingAddress=MailingAddress(
                    address=source.rental_property.property_manager.primary_contact.address.street_address,
                    addressLineTwo=source.rental_property.property_manager.primary_contact.address.street_address_additional,  # noqa: E501
                    city=source.rental_property.property_manager.primary_contact.address.city,
                    postalCode=source.rental_property.property_manager.primary_contact.address.postal_code,
                    province=source.rental_property.property_manager.primary_contact.address.province,
                    country=source.rental_property.property_manager.primary_contact.address.country,
                ),
            ),
            secondaryContact=Contact(
                name=ContactName(
                    firstName=source.rental_property.property_manager.secondary_contact.firstname,
                    middleName=source.rental_property.property_manager.secondary_contact.middlename,
                    lastName=source.rental_property.property_manager.secondary_contact.lastname,
                ),
                dateOfBirth=source.rental_property.property_manager.secondary_contact.date_of_birth,
                socialInsuranceNumber=source.rental_property.property_manager.secondary_contact.social_insurance_number,
                businessNumber=source.rental_property.property_manager.secondary_contact.business_number,
                details=ContactDetails(
                    preferredName=source.rental_property.property_manager.secondary_contact.preferredname,
                    phoneNumber=source.rental_property.property_manager.secondary_contact.phone_number,
                    extension=source.rental_property.property_manager.secondary_contact.phone_extension,
                    faxNumber=source.rental_property.property_manager.secondary_contact.fax_number,
                    emailAddress=source.rental_property.property_manager.secondary_contact.email,
                ),
                mailingAddress=MailingAddress(
                    address=source.rental_property.property_manager.secondary_contact.address.street_address,
                    addressLineTwo=source.rental_property.property_manager.secondary_contact.address.street_address_additional,  # noqa: E501
                    city=source.rental_property.property_manager.secondary_contact.address.city,
                    postalCode=source.rental_property.property_manager.secondary_contact.address.postal_code,
                    province=source.rental_property.property_manager.secondary_contact.address.province,
                    country=source.rental_property.property_manager.secondary_contact.address.country,
                ),
            )
            if source.rental_property.property_manager.secondary_contact
            else None,
            unitAddress=UnitAddress(
                {
                    "address": source.rental_property.address.street_address,
                    "addressLineTwo": source.rental_property.address.street_address_additional,
                    "city": source.rental_property.address.city,
                    "postalCode": source.rental_property.address.postal_code,
                    "province": source.rental_property.address.province,
                    "country": source.rental_property.address.country,
                },
                nickname=source.rental_property.nickname,
            ),
            unitDetails=UnitDetails(
                parcelIdentifier=source.rental_property.parcel_identifier,
                businessLicense=source.rental_property.local_business_licence,
                propertyType=source.rental_property.property_type.name,
                ownershipType=source.rental_property.ownership_type.name,
            ),
            listingDetails=[ListingDetails(url=platform.url) for platform in source.rental_property.rental_platforms],
            principalResidence=PrincipalResidence(
                isPrincipalResidence=source.eligibility.is_principal_residence,
                agreedToRentalAct=source.eligibility.agreed_to_rental_act,
                agreedToSubmit=source.eligibility.agreed_to_submit,
                nonPrincipalOption=source.eligibility.non_principal_option,
                specifiedServiceProvider=source.eligibility.specified_service_provider,
            ),
        )
