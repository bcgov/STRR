import {
  ApplicationStatusE,
  ExaminerApplicationStatusE,
  HostApplicationStatusE,
  RegistrationStatusE,
  RegistrationTypeE
} from '#imports'
import type { PrExemptionReason } from '~/enums/pr-exemption-reason-e'

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

interface StrRequirements {
  isBusinessLicenceRequired: boolean | null
  isPrincipalResidenceRequired: boolean | null
  isStrProhibited: boolean | null
  isStraaExempt: boolean | null
  organizationNm: string | null
}

export interface HostApplicationDetailsI {
  registrationType: RegistrationTypeE,
  listingDetails: ListingDetailsI[]
  primaryContact: ContactI
  secondaryContact?: ContactI
  principalResidence: PrincipalResidenceI
  unitAddress: UnitAddressAPII
  propertyManager?: PropertyManagerI
  strRequirements?: StrRequirements
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
    prExemptReason?: PrExemptionReason
    blExemptReason?: string
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
    mailingAddress: MailingAddressAPII,
    registeredOfficeOrAttorneyForServiceDetails?: {
      attorneyName: string,
      mailingAddress: MailingAddressAPII
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
