export interface ApiHostParty extends ApiParty {
  preferredName?: string
}

export interface ApiHostPartyWithAddress extends ApiHostParty {
  mailingAddress: ApiAddress
}

export interface ApiHostContactDetails extends ApiPhone {
  preferredName?: string
  faxNumber: string
  emailAddress: string
}

export interface ApiHostContactPerson {
  contactType: OwnerType
  name: {
    firstName: string
    middleName?: string
    lastName: string
  }
  details: ApiHostContactDetails
  mailingAddress: ApiAddress
  dateOfBirth?: string
  socialInsuranceNumber?: string
  businessLegalName?: string
  businessNumber?: string
}

export interface ApiHostContactBusiness extends ApiHostContactPerson {
  businessLegalName: string
  businessNumber: string
}

export interface ApiPropertyManagerBusiness {
  legalName: string
  businessNumber?: string
  mailingAddress: ApiAddress
  primaryContact: ApiHostParty
  secondaryContact?: ApiHostParty
}

export interface ApiPropertyManager {
  initiatedByPropertyManager: boolean
  propertyManagerType: OwnerType
  business?: ApiPropertyManagerBusiness // required if OwnerType.BUSINESS
  contact?: ApiHostPartyWithAddress // required if OwnerType.INDIVIDUAL
}

export interface ApiUnitDetails {
  parcelIdentifier?: string
  businessLicense?: string
  businessLicenseExpiryDate?: string
  propertyType: PropertyType | undefined
  ownershipType: OwnershipType | undefined
  rentalUnitSpaceType: RentalUnitType | undefined
  hostResidence: ResidenceType | undefined
  isUnitOnPrincipalResidenceProperty: boolean | undefined
  numberOfRoomsForRent: number | undefined
}

export interface ApiUnitAddress extends ApiBaseAddress {
  nickname: string
  streetName: string,
  streetNumber: string,
  unitNumber: string
}

export interface ApiDocument {
  documentType: DocumentUploadType
  fileKey: string
  fileName: string
  fileType: string
}

export interface ApiResidence {
  isPrincipalResidence: boolean | undefined
  agreedToRentalAct: boolean | undefined
  nonPrincipalOption: PrExemptionReason | undefined
  specifiedServiceProvider: string
  agreedToSubmit: boolean | undefined
}

export interface ApiHostApplication {
  registrationType: ApplicationType
  primaryContact: ApiHostContactPerson | ApiHostContactBusiness
  secondaryContact?: ApiHostContactPerson | ApiHostContactBusiness
  unitDetails: ApiUnitDetails
  unitAddress: ApiUnitAddress
  principalResidence: ApiResidence
  documents?: ApiDocument[]
  propertyManager?: ApiPropertyManager,
  listingDetails: string[]
}

export interface HostApplicationPayload {
  registration: ApiHostApplication
}

export interface HostApplicationResp extends HostApplicationPayload {
  header: ApplicationHeader
}

export interface HostRegistrationResp extends ApiHostApplication, ApiExtraRegistrationDetails {
}
