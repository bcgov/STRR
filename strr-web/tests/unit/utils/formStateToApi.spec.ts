// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { CreateAccountFormStateI, formStateToApi } from '#imports'

it('begins with empty address', () => {
  const firstName = 'first'
  const lastName = 'last'
  const selectedAccountId = '1'
  const hasSecondaryContact = true
  const propertyType = 'propertyType'
  const ownershipType = 'ownershipType'

  const primary = {
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
    socialInsuranceNumber: 'socialInsuranceNumber'
  }

  const secondary = {
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

  const createAccountState: CreateAccountFormStateI = {
    primaryContact: primary,
    secondaryContact: secondary,
    propertyDetails: {
      primaryResidence: 'primaryResidence',
      whichPlatform: 'whichPlatform',
      parcelIdentifier: 'parcelIdentifier',
      businessLicense: 'businessLicense',
      propertyType: 'propertyType',
      ownershipType: 'ownershipType',
      useMailing: false,
      nickname: 'nickname',
      country: 'country',
      address: 'address',
      addressLineTwo: 'addressLineTwo',
      city: 'city',
      province: 'province',
      postalCode: 'postalCode',
      listingDetails: [{ url: 'https://www.airbnb.com' }]
    },
    selectedAccount: {} as OrgI,
    principal: {} as PrincipalResidenceI,
    supportingDocuments: []
  }

  const apiFormattedState = formStateToApi(
    createAccountState,
    firstName,
    lastName,
    selectedAccountId,
    hasSecondaryContact,
    propertyType,
    ownershipType
  )

  expect(apiFormattedState.registration.listingDetails)
    .toEqual(createAccountState.propertyDetails.listingDetails)

  expect(apiFormattedState.registration.unitAddress.address)
    .toEqual(createAccountState.propertyDetails.address)

  expect(apiFormattedState.registration.unitDetails.businessLicense)
    .toEqual(createAccountState.propertyDetails.businessLicense)
})
