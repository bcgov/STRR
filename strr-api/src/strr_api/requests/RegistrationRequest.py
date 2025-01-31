# pylint: disable=C0103
# pylint: disable=R0913
# pylint: disable=R0917
# pylint: disable=R0914
"""
Registration request payload objects.
"""


class RegistrationRequest:
    """RegistrationRequest payload object."""

    def __init__(self, registration, header=None):
        self.registration = Registration(**registration)


class Registration:
    """Registration payload object."""

    def __init__(  # pylint: disable=W0102
        self,
        primaryContact,
        unitAddress,
        unitDetails,
        listingDetails,
        secondaryContact=None,
        documents=[],  # pylint: disable=W0102
        registrationType=None,
        propertyManager=None,
        strRequirements=None,
    ):
        self.primaryContact = Contact(**primaryContact)
        self.secondaryContact = Contact(**secondaryContact) if secondaryContact else None
        self.unitAddress = UnitAddress(**unitAddress)
        self.unitDetails = UnitDetails(**unitDetails)
        self.listingDetails = [ListingDetails(**item) for item in listingDetails]
        self.documents = [Document(**document) for document in documents]
        self.registrationType = registrationType
        self.propertyManager = PropertyManager(**propertyManager) if propertyManager else None
        self.strRequirements = strRequirements


class PropertyManager:
    """Property Manager object."""

    def __init__(
        self,
        propertyManagerType,
        business=None,
        contact=None,
        initiatedByPropertyManager=False,
    ):
        self.propertyManagerType = propertyManagerType
        self.business = Business(**business) if business else None
        self.contact = PropertyManagerContact(**contact) if contact else None
        self.initiatedByPropertyManager = initiatedByPropertyManager


class Business:
    """Business object"""

    def __init__(
        self,
        mailingAddress,
        legalName=None,
        businessNumber=None,
        primaryContact=None,
    ):
        self.mailingAddress = MailingAddress(**mailingAddress)
        self.legalName = legalName
        self.businessNumber = businessNumber
        self.primaryContact = PropertyManagerContact(**primaryContact)


class PropertyManagerContact:
    """Property Manager Contact object."""

    def __init__(
        self,
        firstName,
        lastName,
        phoneNumber,
        emailAddress,
        middleName=None,
        preferredName=None,
        extension=None,
        faxNumber=None,
        phoneCountryCode=None,
        mailingAddress=None,
    ):
        self.firstName = firstName
        self.lastName = lastName
        self.phoneNumber = phoneNumber
        self.phoneCountryCode = phoneCountryCode
        self.emailAddress = emailAddress
        self.middleName = middleName
        self.preferredName = preferredName
        self.extension = extension
        self.faxNumber = faxNumber
        self.mailingAddress = MailingAddress(**mailingAddress) if mailingAddress else None


class ListingDetails:
    """ListingDetails payload object."""

    def __init__(self, url):
        self.url = url


class UnitDetails:
    """UnitDetails payload object."""

    def __init__(
        self,
        propertyType,
        ownershipType,
        rentalUnitSpaceType,
        isUnitOnPrincipalResidenceProperty,
        numberOfRoomsForRent,
        hostResidence=None,
        parcelIdentifier=None,
        businessLicense=None,
        businessLicenseExpiryDate=None,
        blExemptReason=None,
        strataHotelRegistrationNumber=None,
        prExemptReason=None,
    ):
        self.propertyType = propertyType
        self.ownershipType = ownershipType
        self.parcelIdentifier = parcelIdentifier
        self.businessLicense = businessLicense
        self.rentalUnitSpaceType = rentalUnitSpaceType
        self.hostResidence = hostResidence
        self.isUnitOnPrincipalResidenceProperty = isUnitOnPrincipalResidenceProperty
        self.numberOfRoomsForRent = numberOfRoomsForRent
        self.businessLicenseExpiryDate = businessLicenseExpiryDate
        self.blExemptReason = blExemptReason
        self.strataHotelRegistrationNumber = strataHotelRegistrationNumber
        self.prExemptReason = prExemptReason


class MailingAddress:
    """MailingAddress payload object."""

    def __init__(self, address, city, postalCode, province, country, addressLineTwo=None, locationDescription=None):
        self.address = address
        self.city = city
        self.postalCode = postalCode
        self.province = province
        self.country = country
        self.addressLineTwo = addressLineTwo
        self.locationDescription = locationDescription


class UnitAddress:
    """UnitAddress payload object."""

    def __init__(
        self,
        streetNumber,
        streetName,
        city,
        postalCode,
        province,
        country,
        addressLineTwo=None,
        nickname=None,
        unitNumber=None,
        locationDescription=None,
    ):
        self.nickname = nickname
        self.streetNumber = streetNumber
        self.streetName = streetName
        self.city = city
        self.postalCode = postalCode
        self.province = province
        self.country = country
        self.addressLineTwo = addressLineTwo
        self.unitNumber = unitNumber
        self.locationDescription = locationDescription


class Contact:
    """Contact payload object."""

    def __init__(
        self,
        firstName=None,
        lastName=None,
        middleName=None,
        mailingAddress=None,
        socialInsuranceNumber=None,
        businessNumber=None,
        businessLegalName=None,
        contactType=None,
        dateOfBirth=None,
        phoneNumber=None,
        emailAddress=None,
        preferredName=None,
        extension=None,
        faxNumber=None,
        phoneCountryCode=None,
    ):
        self.firstName = firstName
        self.lastName = lastName
        self.middleName = middleName
        self.dateOfBirth = dateOfBirth
        self.socialInsuranceNumber = socialInsuranceNumber
        self.businessNumber = businessNumber
        self.businessLegalName = businessLegalName
        self.contactType = contactType
        self.phoneNumber = phoneNumber
        self.emailAddress = emailAddress
        self.preferredName = preferredName
        self.extension = extension
        self.faxNumber = faxNumber
        self.phoneCountryCode = phoneCountryCode
        self.mailingAddress = MailingAddress(**mailingAddress)


class Document:
    """Document object."""

    def __init__(self, fileName: str, fileType: str, fileKey: str, documentType: str):
        self.fileName = fileName
        self.fileKey = fileKey
        self.fileType = fileType
        self.documentType = documentType
