// @vitest-environment nuxt
import { it, expect } from 'vitest'

it('begins with empty address', () => {
  const hasSecondaryContact = true
  const propertyType = 'propertyType'
  const ownershipType = 'ownershipType'

  const primary: PrimaryContactInformationI = {
    firstName: 'firstName',
    middleName: 'middleName',
    lastName: 'lastName',
    businessLegalName: '',
    preferredName: 'preferredName',
    phoneNumber: 'phoneNumber',
    extension: 'extension',
    faxNumber: 'faxNumber',
    emailAddress: 'emailAddress',
    address: 'address',
    country: 'country',
    addressLineTwo: 'addressLineTwo',
    city: 'city',
    province: 'province',
    postalCode: 'postalCode',
    birthDay: 'birthDay',
    birthMonth: 'birthMonth',
    birthYear: 'birthYear',
    businessNumber: 'businessNumber',
    socialInsuranceNumber: 'socialInsuranceNumber',
    contactType: HostContactTypeE.INDIVIDUAL
  }

  const secondary: SecondaryContactInformationI = {
    preferredName: 'preferredNameSecondary',
    phoneNumber: 'phoneNumberSecondary',
    extension: 'extensionSecondary',
    faxNumber: 'faxNumberSecondary',
    emailAddress: 'emailAddressSecondary',
    address: 'addressSecondary',
    country: 'countrySecondary',
    addressLineTwo: 'addressLineTwoSecondary',
    city: 'citySecondary',
    province: 'provinceSecondary',
    postalCode: 'postalCodeSecondary',
    birthDay: 'birthDaySecondary',
    birthMonth: 'birthMonthSecondary',
    birthYear: 'birthYearSecondary',
    firstName: 'firstNameSecondary',
    middleName: 'middleNameSecondary',
    lastName: 'lastNameSecondary',
    businessNumber: 'businessNumberSecondary',
    socialInsuranceNumber: 'socialInsuranceNumberSecondary'
  }

  const propertyManager: PropertyManagerI = {
    businessLegalName: 'businessLegalName',
    businessNumber: 'businessNumber',
    businessMailingAddress: {
      address: 'address',
      addressLineTwo: 'addressLineTwo',
      city: 'city',
      postalCode: 'postalCode',
      province: 'province',
      country: 'country'
    },
    contact: {
      firstName: 'firstName',
      middleName: 'middleName',
      lastName: 'lastName',
      preferredName: 'preferredName',
      phoneNumber: 'phoneNumber',
      extension: 'extension',
      faxNumber: 'faxNumber',
      emailAddress: 'emailAddress'
    }
  }

  const createAccountState: CreateAccountFormStateI = {
    primaryContact: primary,
    secondaryContact: secondary,
    isPropertyManagerRole: false,
    hasPropertyManager: false,
    propertyManager,
    propertyDetails: {
      primaryResidence: 'primaryResidence',
      whichPlatform: 'whichPlatform',
      parcelIdentifier: 'parcelIdentifier',
      businessLicense: 'businessLicense',
      businessLicenseExpiryDate: 'businessLicenseExpiryDate',
      propertyType: 'propertyType',
      ownershipType: 'ownershipType',
      nickname: 'nickname',
      country: 'country',
      streetNumber: '123',
      streetName: 'Main St',
      unitNumber: 'test',
      addressLineTwo: 'addressLineTwo',
      city: 'city',
      province: 'province',
      postalCode: 'postalCode',
      listingDetails: [{ url: 'https://www.airbnb.com' }],
      rentalUnitSpaceType: '',
      isUnitOnPrincipalResidenceProperty: false,
      hostResidence: '',
      numberOfRoomsForRent: 0
    },
    selectedAccount: {} as OrgI,
    principal: {} as PrincipalResidenceI,
    supportingDocuments: [],
    hasHostAuthorization: false
  }

  const apiFormattedState = formStateToApi(
    createAccountState,
    hasSecondaryContact,
    propertyType,
    ownershipType
  )

  expect(apiFormattedState.registration.listingDetails)
    .toEqual(createAccountState.propertyDetails.listingDetails)

  expect(apiFormattedState.registration.unitAddress.streetNumber)
    .toEqual(createAccountState.propertyDetails.streetNumber)

  expect(apiFormattedState.registration.unitAddress.streetName)
    .toEqual(createAccountState.propertyDetails.streetName)

  expect(apiFormattedState.registration.unitAddress.unitNumber)
    .toEqual(createAccountState.propertyDetails.unitNumber)

  expect(apiFormattedState.registration.unitDetails.businessLicense)
    .toEqual(createAccountState.propertyDetails.businessLicense)
})
