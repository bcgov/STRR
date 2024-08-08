import { AccountStatusE } from '~/enums/account-status-e'
import { ApplicationStatusE } from '~/enums/application-status-e'

interface ApplicationHeaderI {
  applicationDateTime: string
  decisionDate: string | null
  id: number
  name: string
  paymentAccount: string
  paymentStatus: string
  paymentToken: number
  registrationEndDate: string
  registrationId: number
  registrationNumber: string
  registrationStartDate: string
  registrationStatus: AccountStatusE
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

interface ApplicationDetailsI {
  listingDetails: ListingDetailsI[],
  primaryContact: ContactI
  principalResidence: PrincipalResidenceI
  unitAddress: RegistrationAddressI
  unitDetails: {
    parcelIdentifier?: string,
    businessLicense?: string,
    propertyType: string,
    ownershipType: string
  }
}

export interface ApplicationI {
  header: ApplicationHeaderI
  registration: ApplicationDetailsI
  selectedAccount: {
    sbc_account_id: string
  }
}
