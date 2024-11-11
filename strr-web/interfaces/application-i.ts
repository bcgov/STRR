import {
  ApplicationStatusE,
  ExaminerApplicationStatusE,
  HostApplicationStatusE,
  RegistrationStatusE,
  RegistrationTypeE
} from '#imports'

export interface ApplicationHeaderI {
  applicationDateTime: string
  decisionDate: string | null
  applicationNumber: string
  name: string
  paymentAccount: string
  paymentStatus: string
  hostActions: string[]
  examinerActions: string[]
  paymentToken: number
  registrationEndDate: string
  registrationId: number
  registrationNumber: string
  registrationStartDate: string
  isCertificateIssued: boolean,
  registrationStatus: RegistrationStatusE
  reviewer: {
    displayName: string
    username: string
  }
  status: ApplicationStatusE,
  hostStatus: HostApplicationStatusE,
  examinerStatus: ExaminerApplicationStatusE,
  submitter: {
    displayName: string
    username: string
  }
}

interface ListingDetailsI {
  url: string
}

export interface HostApplicationDetailsI {
  registrationType: RegistrationTypeE,
  listingDetails: ListingDetailsI[]
  primaryContact: ContactI
  secondaryContact?: ContactI
  principalResidence: PrincipalResidenceI
  unitAddress: RegistrationAddressI
  propertyManager?: PropertyManagerI
  unitDetails: {
    parcelIdentifier?: string
    businessLicense?: string
    businessLicenseExpiryDate?: string
    propertyType: string
    ownershipType: string
    rentalUnitSpaceType: string
    isUnitOnPrincipalResidenceProperty: boolean
    hostResidence: string | undefined
    numberOfRoomsForRent: number
  }
  documents?: DocumentUploadI[]
}

export interface PlatformApplicationDetailsI {
  registrationType: RegistrationTypeE.PLATFORM,
  completingParty?: ContactI,
  platformRepresentatives: ContactI[],
  businessDetails: {
    legalName: string,
    homeJurisdiction: string,
    businessNumber?: string,
    consumerProtectionBCLicenceNumber?: string,
    noticeOfNonComplianceEmail: string,
    noticeOfNonComplianceOptionalEmail?: string,
    takeDownRequestEmail: string,
    takeDownRequestOptionalEmail?: string,
    mailingAddress: MailingAddressI,
    registeredOfficeOrAttorneyForServiceDetails?: {
      attorneyName: string,
      mailingAddress: MailingAddressI
    }
  },
  platformDetails: {
    brands: {
      name: string,
      website: string
    }[],
    listingSize: ListingSizeE
  }
}

export type ApplicationDetailsI = HostApplicationDetailsI | PlatformApplicationDetailsI

export interface ApplicationI {
  header: ApplicationHeaderI
  registration: ApplicationDetailsI
  selectedAccount: {
    sbc_account_id: string
  }
}
