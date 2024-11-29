export interface ApiHostContactDetails extends ApiPhone {
  preferredName: string
  faxNumber: string
  emailAddress: string
}

export interface ApiHostBusinessDetails {
  businessLegalName: string
  businessNumber: string
}

export interface ApiHostContactBusiness extends ApiHostBusinessDetails {
  ownerType: OwnerType,
  name: {
    firstName: string
    middleName: string
    lastName: string
  }
  details: ApiHostContactDetails
  mailingAddress: ApiAddress
}

export interface ApiHostContactPerson extends ApiHostContactBusiness {
  dateOfBirth: string
}

export interface ApiPropertyManagerContact extends ApiParty, ApiHostContactDetails {}

export interface ApiPropertyManager extends ApiHostBusinessDetails {
  businessMailingAddress: ApiAddress
  initiatedByPropertyManager: boolean
  contact: ApiPropertyManagerContact
}

export interface ApiUnitDetails {
  parcelIdentifier: string
  businessLicense: string
  businessLicenseExpiryDate: string
  propertyType: PropertyType | undefined
  ownershipType: OwnwershipType | undefined
  rentalUnitSpaceType: RentalUnitType | undefined
  hostResidence: ResidenceType | undefined
  isUnitOnPrincipalResidenceProperty: boolean | undefined
  numberOfRoomsForRent: number | undefined
}

export interface ApiUnitAddress extends ApiAddress {
  nickname: string
  unitNumber: string
}

export interface ApiDocument {
  fileKey: string
  fileName: string
  fileType: string
}

export interface ApiResidence {
  isPrincipalResidence: boolean | undefined
  agreedToRentalAct: boolean | undefined
  nonPrincipalOption: string
  specifiedServiceProvider: string
  agreedToSubmit: boolean | undefined
}

export interface ApiHostApplication {
  registrationType: ApplicationType
  primaryContact: ApiHostContactPerson | ApiHostContactBusiness
  secondaryContact: ApiHostContactPerson | ApiHostContactBusiness
  listingDetails: { url: string }[]
  unitDetails: ApiUnitDetails
  unitAddress: ApiUnitAddress
  principalResidence: ApiResidence
  documents?: ApiDocument[]
}
