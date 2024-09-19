import { RegistrationStatusE, ApplicationStatusE, RegistrationTypeE } from '#imports'
export interface ApplicationHeaderI {
  applicationDateTime: string
  decisionDate: string | null
  id: number
  applicationNumber: string
  name: string
  paymentAccount: string
  paymentStatus: string
  paymentToken: number
  registrationEndDate: string
  registrationId: number
  registrationNumber: string
  registrationStartDate: string
  registrationStatus: RegistrationStatusE
  reviewer: {
    displayName: string
    username: string
  }
  status: ApplicationStatusE
  submitter: {
    displayName: string
    username: string
  }
}

interface ListingDetailsI {
  url: string
}

export interface ApplicationDetailsI {
  registrationType: RegistrationTypeE,
  listingDetails: ListingDetailsI[]
  primaryContact: ContactI
  secondaryContact?: ContactI
  principalResidence: PrincipalResidenceI
  unitAddress: RegistrationAddressI
  unitDetails: {
    parcelIdentifier?: string
    businessLicense?: string
    propertyType: string
    ownershipType: string
  }
  documents?: DocumentUploadI[]
}

export interface ApplicationI {
  header: ApplicationHeaderI
  registration: ApplicationDetailsI
  selectedAccount: {
    sbc_account_id: string
  }
}
