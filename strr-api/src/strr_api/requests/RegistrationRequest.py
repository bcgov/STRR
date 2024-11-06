# pylint: disable=C0103
# pylint: disable=R0913
# pylint: disable=R0917
"""
Registration request payload objects.
"""


class RegistrationRequest:
    """RegistrationRequest payload object."""

    def __init__(self, registration):
        self.registration = Registration(**registration)


class Registration:
    """Registration payload object."""

    def __init__(  # pylint: disable=W0102
        self,
        primaryContact,
        unitAddress,
        unitDetails,
        listingDetails,
        principalResidence,
        secondaryContact=None,
        documents=[],  # pylint: disable=W0102
        registrationType=None,
        propertyManager=None,
    ):
        self.primaryContact = Contact(**primaryContact)
        self.secondaryContact = Contact(**secondaryContact) if secondaryContact else None
        self.unitAddress = UnitAddress(**unitAddress)
        self.unitDetails = UnitDetails(**unitDetails)
        self.listingDetails = [ListingDetails(**item) for item in listingDetails]
        self.principalResidence = PrincipalResidence(**principalResidence)
        self.documents = [Document(**document) for document in documents]
        self.registrationType = registrationType
        self.propertyManager = PropertyManager(**propertyManager) if propertyManager else None


class PropertyManager:
    """Property Manager object."""

    def __init__(
        self,
        contact,
        businessMailingAddress,
        businessLegalName=None,
        businessNumber=None,
    ):
        self.contact = PropertyManagerContact(**contact)
        self.businessMailingAddress = MailingAddress(**businessMailingAddress)
        self.businessLegalName = businessLegalName
        self.businessNumber = businessNumber


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
    ):
        self.firstName = firstName
        self.lastName = lastName
        self.phoneNumber = phoneNumber
        self.emailAddress = emailAddress
        self.middleName = middleName
        self.preferredName = preferredName
        self.extension = extension
        self.faxNumber = faxNumber


class PrincipalResidence:
    """PrincipalResidence payload object."""

    def __init__(
        self,
        isPrincipalResidence,
        agreedToRentalAct,
        agreedToSubmit,
        nonPrincipalOption=None,
        specifiedServiceProvider=None,
    ):
        self.isPrincipalResidence = isPrincipalResidence
        self.agreedToRentalAct = agreedToRentalAct
        self.agreedToSubmit = agreedToSubmit
        self.nonPrincipalOption = nonPrincipalOption
        self.specifiedServiceProvider = specifiedServiceProvider


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


class MailingAddress:
    """MailingAddress payload object."""

    def __init__(self, address, city, postalCode, province, country, addressLineTwo=None):
        self.address = address
        self.city = city
        self.postalCode = postalCode
        self.province = province
        self.country = country
        self.addressLineTwo = addressLineTwo


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


class ContactName:
    """ContactName payload object."""

    def __init__(self, firstName, lastName, middleName=None):
        self.firstName = firstName
        self.lastName = lastName
        self.middleName = middleName


class ContactDetails:
    """ContactDetails payload object."""

    def __init__(self, phoneNumber, emailAddress, preferredName=None, extension=None, faxNumber=None):
        self.phoneNumber = phoneNumber
        self.emailAddress = emailAddress
        self.preferredName = preferredName
        self.extension = extension
        self.faxNumber = faxNumber


class Contact:
    """Contact payload object."""

    def __init__(
        self,
        name,
        details,
        mailingAddress,
        socialInsuranceNumber=None,
        businessNumber=None,
        businessLegalName=None,
        contactType=None,
        dateOfBirth=None,
    ):
        self.name = ContactName(**name)
        self.dateOfBirth = dateOfBirth
        self.socialInsuranceNumber = socialInsuranceNumber
        self.businessNumber = businessNumber
        self.details = ContactDetails(**details)
        self.mailingAddress = MailingAddress(**mailingAddress)
        self.businessLegalName = businessLegalName
        self.contactType = contactType


class Document:
    """Document object."""

    def __init__(self, fileName: str, fileType: str, fileKey: str):
        self.fileName = fileName
        self.fileKey = fileKey
        self.fileType = fileType
