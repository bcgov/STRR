import { PropertyManagerI } from './property-manager-i'
import { RegistrationTypeE } from '#imports'
import { AccountStatusE } from '~/enums/account-status-e'
import { AccountTypeE } from '~/enums/account-type-e'
import { UserSettingsTypeE } from '~/enums/user-settings-type-e'
import type { HostContactTypeE } from '~/enums/host-contact-type-e'

export interface DateOfBirthI {
  day: string
  month: string
  year: string
}

export interface AddressI {
  city: string
  country: string
  postalCode: string
  region: string
  street: string
  streetAdditional: string
  phone: string
  email: string
  phoneExtension: string
}

export interface AccountI {
  id: string
  accessType: string
  accountType: AccountTypeE
  accountStatus: AccountStatusE
  additionalLabel?: string
  label: string
  type: UserSettingsTypeE
  urlpath: string
  urlorigin: string
  address: string
  mailingAddress?: AddressI[]
}

export interface OrgI {
  accessType: string
  branchName: string
  created: string
  createdBy: string
  id: string
  isBusinessAccount: boolean
  mailingAddress: AddressI[]
  modifiedBy: string
  name: string
  orgStatus: AccountStatusE
  orgType: AccountTypeE
  statusCode: string
  uuid: string
}

export interface ContactI {
  socialInsuranceNumber: string
  businessNumber: string
  dateOfBirth: string
  details: {
    emailAddress: string
    extension: string
    faxNumber: string
    phoneNumber: string
    preferredName: string
  }
  mailingAddress: {
    address: string
    addressLineTwo: string
    city: string
    country: string
    postalCode: string
    province: string
  }
  name: {
    firstName: string
    lastName: string
    middleName: string
  }
}

interface UserTermsI {
  isTermsOfUseAccepted: boolean
  termsOfUseAcceptedVersion: string
}

export interface ProfileI {
  contacts: ContactI[]
  created: string
  firstname: string
  id: number
  idpUserid: string
  keycloakGuid: string
  lastname: string
  loginSource: string
  loginTime: string
  modified: string
  modifiedBy: string
  type: string
  userStatus: number
  userTerms: UserTermsI
  username: string
  verified: boolean
}

export interface MeI {
  orgs: OrgI[]
  profile: ProfileI
  settings: UserSettingsI[]
}

export interface ContactInformationI {
  preferredName: string | undefined
  phoneNumber: string | undefined
  extension: string | undefined
  faxNumber: string | undefined
  emailAddress: string | undefined
  address: string | undefined
  country: string | undefined
  addressLineTwo: string | undefined
  city: string | undefined
  province: string | undefined
  postalCode: string | undefined
  birthDay: string | undefined
  birthMonth: string | undefined
  birthYear: string | undefined
}

export interface PrimaryContactInformationI extends ContactInformationI {
  firstName: string
  middleName: string
  lastName: string
  businessNumber: string
  businessLegalName: string
  socialInsuranceNumber: string
  contactType: HostContactTypeE
}

export interface SecondaryContactInformationI extends ContactInformationI {
  firstName: string
  middleName: string
  lastName: string
  businessNumber: string
  socialInsuranceNumber: string
}

export interface PrincipalResidenceI {
  agreedToRentalAct: boolean
  agreedToSubmit: boolean
  isPrincipalResidence: boolean
  nonPrincipalOption: string
  specifiedServiceProvider: string
}

export interface CreateAccountFormStateI {
  primaryContact: PrimaryContactInformationI
  secondaryContact: SecondaryContactInformationI
  propertyManager: PropertyManagerI
  isPropertyManagerRole: boolean
  hasPropertyManager: boolean
  propertyDetails: PropertyDetailsI
  selectedAccount: OrgI
  principal: PrincipalResidenceI
  supportingDocuments: File[],
  hasHostAuthorization: boolean
}

export interface MailingAddressAPII {
  address: string
  addressLineTwo?: string
  city: string
  postalCode: string
  province: string
  country: string
}

export interface UnitAddressI {
  streetNumber: string
  streetName: string
  unitNumber?: string
  addressLineTwo?: string
  city: string
  postalCode: string
  province: string
  country: string
  nickname: string
}

export interface ContactNameAPII {
  firstName: string
  middleName?: string
  lastName: string
}

export interface ContactAPII {
  name: ContactNameAPII
  dateOfBirth?: string // not required for Contact Type Business
  details: {
    preferredName?: string
    phoneNumber: string
    extension?: string
    faxNumber?: string
    emailAddress: string
  }
  mailingAddress: MailingAddressAPII
  socialInsuranceNumber?: string // not required for Contact Type Business
  businessNumber: string
  businessLegalName: string
  contactType: HostContactTypeE
}

export interface SelectedAccountMailingAPII {
  street: string
  streetAdditional: string
  city: string
  postalCode: string
  region: string
  country: string
}

export interface CreateAccountFormAPII {
  registration: {
    principalResidence: {
      isPrincipalResidence: boolean
      agreedToRentalAct: boolean
      nonPrincipalOption?: string
      specifiedServiceProvider?: string
      agreedToSubmit: boolean
    }
    primaryContact?: ContactAPII
    secondaryContact?: ContactAPII
    propertyManager?: PropertyManagerI
    unitAddress: UnitAddressI
    unitDetails: {
      parcelIdentifier?: string
      businessLicense?: string
      businessLicenseExpiryDate?: string
      propertyType: string
      ownershipType: string
      rentalUnitSpaceType: string
      isUnitOnPrincipalResidenceProperty: boolean | undefined
      hostResidence: string | undefined
      numberOfRoomsForRent: number
    }
    listingDetails?: { url: string }[]
    documents?: DocumentUploadI[],
    registrationType: RegistrationTypeE
  }
}
