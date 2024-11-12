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
  unitAddress: UnitAddressAPII
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
