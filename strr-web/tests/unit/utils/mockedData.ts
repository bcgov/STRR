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

export const testUserSettings = [
  {
    accountStatus: AccountStatusE.ACTIVE,
    accountType: AccountTypeE.PREMIUM,
    id: 123,
    label: 'Test Dev 1',
    type: UserSettingsTypeE.ACCOUNT
  },
  {
    accountStatus: AccountStatusE.ACTIVE,
    accountType: AccountTypeE.BASIC,
    id: 124,
    label: 'Test Dev 2',
    type: UserSettingsTypeE.ACCOUNT
  },
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

export const testUserSettingsBlank = [
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

export const existingAccountList = [
  {
    accountStatus: 'ACTIVE',
    accountType: 'PREMIUM',
    id: 123,
    label: 'Smith Autos',
    type: 'ACCOUNT',
    mailingAddress: {
      city: 'Calgary',
      country: 'CA',
      postalCode: 'T3A 5K5',
      region: 'AB',
      street: '9874 Hidden Valley Dr NW',
      streetAdditional: ''
    }
  },
  {
    accountStatus: 'ACTIVE',
    accountType: 'PREMIUM',
    id: 124,
    label: 'Smith Autos 2',
    type: 'ACCOUNT',
    mailingAddress: {
      city: 'Calgary',
      country: 'CA',
      postalCode: 'T3A 5K5',
      region: 'AB',
      street: '9874 Hidden Valley Dr NW',
      streetAdditional: ''
    }
  }
]

export const testDetailsForDev1 = {
  accessType: 'REGULAR',
  branchName: '',
  businessName: 'Test Dev 1',
  businessSize: '0-1',
  businessType: 'BIZAC',
  created: '2022-01-06T00:11:11+00:00',
  createdBy: 'BCREGTEST HARRIETT FORTY',
  hasApiAccess: false,
  id: 123,
  isBusinessAccount: true,
  mailingAddress: {
    city: 'Victoria',
    country: 'CA',
    postalCode: 'V8V8V8',
    region: 'BC',
    street: '8888 Smith Street',
    streetAdditional: '8888 Smith Street'
  },
  modified: '2022-01-06T00:11:11+00:00',
  name: 'Test Dev 1',
  orgStatus: AccountStatusE.ACTIVE,
  orgType: AccountTypeE.PREMIUM,
  statusCode: AccountStatusE.ACTIVE,
  uuid: '2b2251d6-679b-4b1d-b997-38edf4eb1904'
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

export const testMe = {
  orgs: [testDetailsForDev1],
  profile: {
    contacts: [{
      email: '',
      phone: '',
      phoneExtension: ''
    }],
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
  },
  settings: [{
    id: '',
    type: UserSettingsTypeE.ACCOUNT,
    urlpath: '',
    urlorigin: ''
  }]
}
