import type { ProfileI } from '~/interfaces/account-i'

export const testParsedToken = {
  firstname: 'First',
  lastname: 'Last',
  name: 'First Last',
  username: 'Username',
  email: 'test@email.com',
  sub: '123456',
  loginSource: 'BCSC',
  realm_access: { roles: ['role1', 'role2'] }
}

export const testProfile = { firstName: 'Test', lastName: 'TEST' }

export const mockUserSettings: AccountI[] = [
  {
    accountStatus: AccountStatusE.ACTIVE,
    accountType: AccountTypeE.PREMIUM,
    id: '123',
    label: 'Test Dev 1',
    type: UserSettingsTypeE.ACCOUNT,
    accessType: '',
    urlpath: '',
    urlorigin: '',
    address: ''
  },
  {
    accountStatus: AccountStatusE.ACTIVE,
    accountType: AccountTypeE.BASIC,
    id: '124',
    label: 'Test Dev 2',
    type: UserSettingsTypeE.ACCOUNT,
    accessType: '',
    urlpath: '',
    urlorigin: '',
    address: ''
  },
  {
    accountStatus: AccountStatusE.ACTIVE,
    accountType: AccountTypeE.BASIC,
    id: '125',
    label: 'USER PROFILE',
    type: UserSettingsTypeE.USER_PROFILE,
    accessType: '',
    urlpath: '',
    urlorigin: '',
    address: ''
  },
  {
    accountStatus: AccountStatusE.ACTIVE,
    accountType: AccountTypeE.BASIC,
    id: '126',
    label: 'CREATE ACCOUNT',
    type: UserSettingsTypeE.CREATE_ACCOUNT,
    accessType: '',
    urlpath: '',
    urlorigin: '',
    address: ''
  }
]

export const mockUserSettingsBlank = [
  {
    id: 125,
    label: 'USER PROFILE',
    type: UserSettingsTypeE.USER_PROFILE
  },
  {
    id: 126,
    label: 'CREATE ACCOUNT',
    type: UserSettingsTypeE.CREATE_ACCOUNT
  }
]

export const mockExistingAccountList: AccountI[] = [
  {
    accountStatus: AccountStatusE.ACTIVE,
    accountType: AccountTypeE.PREMIUM,
    id: '123',
    label: 'Smith Autos',
    type: UserSettingsTypeE.ACCOUNT,
    mailingAddress: [
      {
        city: 'Calgary',
        country: 'CA',
        postalCode: 'T3A 5K5',
        region: 'AB',
        street: '9874 Hidden Valley Dr NW',
        streetAdditional: '',
        phone: '',
        email: '',
        phoneExtension: ''
      } as AddressI
    ],
    accessType: '',
    urlpath: '',
    urlorigin: '',
    address: ''
  },
  {
    accountStatus: AccountStatusE.ACTIVE,
    accountType: AccountTypeE.PREMIUM,
    id: '124',
    label: 'Smith Autos 2',
    type: UserSettingsTypeE.ACCOUNT,
    mailingAddress: [
      {
        city: 'Calgary',
        country: 'CA',
        postalCode: 'T3A 5K5',
        region: 'AB',
        street: '9874 Hidden Valley Dr NW',
        streetAdditional: '',
        phone: '',
        email: '',
        phoneExtension: ''
      } as AddressI
    ],
    accessType: '',
    urlpath: '',
    urlorigin: '',
    address: ''
  }
]

export const mockMailingAddress: AddressI = {
  city: 'Victoria',
  country: 'CA',
  postalCode: 'V8V8V8',
  region: 'BC',
  street: '9999 Smith Street',
  streetAdditional: '9999 Smith Street',
  phone: '123-555-6677',
  email: 'john.doe@example.com',
  phoneExtension: '987-654-3210'
}

export const testDetailsForDev1: OrgI = {
  accessType: 'REGULAR',
  branchName: '',
  // businessName: 'Test Dev 1',
  // businessSize: '0-1',
  // businessType: 'BIZAC',
  created: '2022-01-06T00:11:11+00:00',
  createdBy: 'BCREGTEST HARRIETT FORTY',
  // hasApiAccess: false,
  id: '123',
  isBusinessAccount: true,
  mailingAddress: [mockMailingAddress],
  // modified: '2022-01-06T00:11:11+00:00',
  name: 'Test Dev 1',
  orgStatus: AccountStatusE.ACTIVE,
  orgType: AccountTypeE.PREMIUM,
  statusCode: AccountStatusE.ACTIVE,
  uuid: '2b2251d6-679b-4b1d-b997-38edf4eb1904',
  modifiedBy: ''
}

export const testDetailsForDev2 = {
  accessType: 'REGULAR',
  branchName: '',
  businessName: 'Test Dev 2',
  businessSize: '0-1',
  businessType: 'BIZAC',
  created: '2022-01-06T00:11:11+00:00',
  createdBy: 'BCREGTEST HARRIETT FORTY',
  hasApiAccess: false,
  id: 124,
  isBusinessAccount: true,
  mailingAddress: {
    city: 'Victoria',
    country: 'CA',
    postalCode: 'V8V8V8',
    region: 'BC',
    street: '9999 Smith Street',
    streetAdditional: '9999 Smith Street'
  },
  modified: '2022-01-06T00:11:11+00:00',
  name: 'Test Dev 2',
  orgStatus: AccountStatusE.ACTIVE,
  orgType: AccountTypeE.BASIC,
  statusCode: AccountStatusE.ACTIVE,
  uuid: '2b2251d6-679b-4b1d-b997-38edf4eb1904'
}

export const mockContact: ContactI = {
  socialInsuranceNumber: '123-456-789',
  businessNumber: 'BN123456789',
  dateOfBirth: '1990-01-01',
  details: {
    emailAddress: 'john.doe@example.com',
    extension: '123',
    faxNumber: '123-456-7890',
    phoneNumber: '987-654-3210',
    preferredName: 'John'
  },
  mailingAddress: {
    address: '123 Main St',
    addressLineTwo: 'Apt 4B',
    city: 'Victoria',
    country: 'Canada',
    postalCode: 'V8V 2V2',
    province: 'BC'
  },
  name: {
    firstName: 'John',
    lastName: 'Doe',
    middleName: 'Michael'
  }
}

export const mockProfile: ProfileI = {
  contacts: [mockContact],
  created: '',
  firstname: '',
  id: 0,
  idpUserid: '',
  keycloakGuid: '',
  lastname: '',
  loginSource: '',
  loginTime: '',
  modified: '',
  modifiedBy: '',
  type: '',
  userStatus: 0,
  userTerms: {
    isTermsOfUseAccepted: true,
    termsOfUseAcceptedVersion: ''
  },
  username: '',
  verified: true
}

export const testMe: MeI = {
  orgs: [testDetailsForDev1],
  profile: mockProfile,
  settings: mockUserSettings
}
