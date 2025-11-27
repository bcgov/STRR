export interface ApiPartyWithAddress extends ApiParty {
  mailingAddress: ApiAddress
}

export interface ApiHostContactPerson extends ApiPartyWithAddress {
  contactType: OwnerType
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
  primaryContact: ApiParty
  secondaryContact?: ApiParty
}

export interface ApiPropertyManager {
  initiatedByPropertyManager: boolean
  propertyManagerType: OwnerType
  business?: ApiPropertyManagerBusiness // required if OwnerType.BUSINESS
  contact?: ApiPartyWithAddress // required if OwnerType.INDIVIDUAL
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
  prExemptReason?: PrExemptionReason
  blExemptReason?: string
  strataHotelCategory?: StrataHotelCategory
  strataHotelRegistrationNumber?: string
  hostType?: PropertyHostType
  rentalUnitSetupOption?: RentalUnitSetupOption
}

export interface ApiUnitAddress extends ApiBaseAddress {
  nickname: string
  streetName: string,
  streetNumber: string,
  unitNumber: string
}

export interface ApiHostApplication {
  registrationType: ApplicationType
  primaryContact: ApiHostContactPerson | ApiHostContactBusiness
  secondaryContact?: ApiHostContactPerson | ApiHostContactBusiness
  unitDetails: ApiUnitDetails
  unitAddress: ApiUnitAddress
  propertyManager?: ApiPropertyManager,
  strRequirements?: PropertyRequirements
  documents: ApiDocument[]
  listingDetails: string[]
  conditionsOfApproval?: ConditionsOfApproval
}

export interface HostApplicationPayload {
  header: { paymentMethod: ConnectPaymentMethod }
  // Draft applications will not have all fields defined yet
  registration: Partial<ApiHostApplication>
}

export interface HostApplicationResp extends HostApplicationPayload {
  header: ApplicationHeader
}

export interface HostRegistrationResp extends ApiHostApplication, ApiExtraRegistrationDetails {
}

export interface RegistrationApplication {
  applicationNumber: string
  applicationDateTime: string
  applicationType: string
  applicationStatus: string
}
