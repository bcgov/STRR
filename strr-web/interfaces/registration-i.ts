export interface RegistrationAddressI {
  city: string
  country: string
  postalCode: string
  province: string
  streetNumber: string
  streetName: string
  unitNumber?: string
  addressLineTwo: string
  nickname: string
}

export interface MailingAddressI {
  city: string
  country: string
  postalCode: string
  province: string
  address: string
  addressLineTwo: string
}

export interface RegistrationI {
  id: number
  registration_number?: string
  invoices: {
    'invoice_id': number
    'payment_account': string
    'payment_completion_date': string
    'payment_status_code': string
    'registration_id': number
  }[],
  listingDetails: { url: string }[]
  primaryContact: ContactI
  secondaryContact: ContactI | null
  principalResidence: PrincipalResidenceI
  propertyManager?: PropertyManagerI
  sbc_account_id: number
  status: string
  submissionDate: string
  unitAddress: RegistrationAddressI
  unitDetails: {
    parcelIdentifier?: string,
    businessLicense?: string,
    businessLicenseExpiryDate?: string,
    propertyType: string,
    ownershipType: string,
    rentalUnitSpaceType: string,
    isUnitOnPrincipalResidenceProperty: boolean,
    hostResidence: string,
    numberOfRoomsForRent: number
  },
  updatedDate: string
  user_id: number
  documents?: DocumentUploadI[]
}
