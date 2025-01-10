import { expect, type Page } from '@playwright/test'
import { config as dotenvConfig } from 'dotenv'
/* eslint-disable max-len */
import { LoginSource } from '../enums/login-source'
import { generateOTP } from './generate-otp'
import { getH2 } from './getters'
import { uploadDocuments } from './upload-documents'
import { assertLookupAddress } from './assertion-helpers'
// load default env
dotenvConfig()

export async function completeLogin (page: Page, loginMethod: LoginSource) {
  const baseUrl = process.env.NUXT_BASE_URL!
  const username = loginMethod === LoginSource.BCSC
    ? process.env.PLAYWRIGHT_TEST_BCSC_USERNAME!
    : process.env.PLAYWRIGHT_TEST_BCEID_USERNAME!
  const password = loginMethod === LoginSource.BCSC
    ? process.env.PLAYWRIGHT_TEST_BCSC_PASSWORD!
    : process.env.PLAYWRIGHT_TEST_BCEID_PASSWORD!
  const environment = process.env.NUXT_ENVIRONMENT_HEADER!.toLowerCase()
  const otpSecret = process.env.PLAYWRIGHT_TEST_BCEID_OTP_SECRET!

  await page.goto('en-CA/auth/login')

  if (loginMethod === LoginSource.BCSC) {
    await page.getByRole('button', { name: 'Continue with BC Services Card' }).click()
    await page.getByLabel('Log in with Test with').click()
    await page.getByLabel('Email or username').fill(username)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Continue' }).click()
  } else if (loginMethod === LoginSource.BCEID) {
    await page.getByRole('button', { name: 'Continue with BCeID' }).click()
    await page.locator('#user').fill(username)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Continue' }).click()
    if (environment.toLowerCase() !== 'development') {
      const accountActivity = page.getByText('To complete login with your')
      if (accountActivity) {
        await page.getByRole('button', { name: 'Continue' }).click()
      }
      const otp = generateOTP(otpSecret)
      await page.getByLabel('One-time code').click()
      await page.getByLabel('One-time code').fill(otp)
      await page.getByRole('button', { name: 'Sign In' }).click()
    }
  }

  await page.waitForURL(baseUrl + '**')
}

export async function chooseAccount (page: Page, loginMethod: LoginSource) {
  await page.goto('./en-CA/auth/account/choose-existing', { waitUntil: 'networkidle' })

  await expect(page.getByTestId('h1')).toContainText('Existing Account Found')

  if (loginMethod === LoginSource.BCSC) {
    const accountName = process.env.PLAYWRIGHT_TEST_BCSC_PREMIUM_ACCOUNT_NAME
    await page.getByLabel(`Use this Account, ${accountName}`).click() // select premium account
  } else {
    const accountName = process.env.PLAYWRIGHT_TEST_BCEID_PREMIUM_ACCOUNT_NAME
    await page.getByLabel(`Use this Account, ${accountName}`).click() // select premium account
  }
}

export const completeStep1 = async (
  page: Page,
  lookupAddress: string | {
    streetNumber: string;
    streetName: string;
    city: string;
    postalCode: string;
  },
  nickname: string,
  propertyType: string,
  typeOfSpace: string,
  rentalUnitSetupType: string,
  numberOfRooms: string,
  ownershipType: string,
  testPid: string,
  scenarioSpecificItems: () => Promise<void>
) => {
  await page.goto('./en-CA/application') // go to application

  // check for step 1 content
  await expect(page.getByTestId('h1')).toContainText('Short-Term Rental Registration')
  await expect(getH2(page)).toContainText('Define Your Short-Term Rental')

  // fill in rental unit nickname
  await page.getByTestId('rental-unit-address-nickname').fill(nickname)

  // enter address autocomplete or manual
  await page.locator('#rental-property-address-lookup-street').click()
  if (typeof lookupAddress === 'string') {
    await page.keyboard.type(lookupAddress, { delay: 100 }) // using .fill() doesnt trigger canada post api
    await page.getByRole('option', { name: lookupAddress }).click() // 'Barkley Terr'
  } else { // enter address manually if not string
    await page.getByRole('button', { name: 'Enter the residential address manually' }).click()
    await page.getByTestId('rental-property-address-streetNumber').fill(lookupAddress.streetNumber)
    await page.getByTestId('rental-property-address-streetName').fill(lookupAddress.streetName)
    await page.getByTestId('address.city').fill(lookupAddress.city)
    await page.getByTestId('address.postalCode').fill(lookupAddress.postalCode)
    await page.getByRole('button', { name: 'Done', exact: true }).click()
  }
  await page.getByTestId('property-requirements-section').waitFor({ state: 'visible', timeout: 10000 }) // wait for autocomplete requirements to be displayed

  // execute scenario specific actions/assertions
  await scenarioSpecificItems()

  // fill out unit details
  await page.getByLabel('Property Type').click()
  await page.getByRole('option', { name: propertyType }).click()
  await page.locator('#rental-type-radio-group').getByLabel(typeOfSpace).check() // 'Entire home (guests have the entire place to themselves)'
  await page.locator('#rental-unit-setup-radio-group').getByLabel(rentalUnitSetupType).check() // "This unit is the host's principal residence"
  await page.getByTestId('property-rooms').fill(numberOfRooms)
  await page.locator('#ownership-type-radio-group').getByLabel(ownershipType, { exact: true }).check() // 'Owner'
  await page.getByTestId('property-parcel-id').fill(testPid)

  // finalize step 1
  page.getByRole('button', { name: 'Add Individuals and Businesses', exact: true }).click()
  await expect(getH2(page)).toContainText('Individuals and Businesses')
}

export const completeStep2 = async (
  page: Page,
  completingParty: HostOwner,
  cohost: HostOwner,
  propertyManager: HostOwner
) => {
  await expect(getH2(page)).toContainText('Individuals and Businesses')
  // fill out completing party
  await page.getByRole('button', { name: 'Add an Individual', exact: true }).click()
  await expect(page.locator('section').filter({ hasText: 'Add an Individual' })).toBeVisible()
  const compPartySection = page.locator('section').filter({ hasText: 'Add an Individual' })
  // add host role birth date and SIN
  await compPartySection.locator('input[type="checkbox"][name="isCompParty"]').check()
  await compPartySection.getByTestId('host-owner-preferred-name').fill(completingParty.preferredName!)
  await compPartySection.locator('input[type="radio"][value="HOST"]').check()
  await compPartySection.getByTestId('date-select').fill(completingParty.dateOfBirth)
  await compPartySection.getByTestId('host-owner-taxNumber').fill(completingParty.taxNumber)
  // add host mailing address
  await compPartySection.getByTestId('host-owner-address-country').click()
  await compPartySection.getByRole('option', { name: 'Canada' }).click()
  await compPartySection.getByTestId('host-owner-address-street').fill(completingParty.mailingAddress.street)
  await compPartySection.getByTestId('mailingAddress.city').fill(completingParty.mailingAddress.city)
  await compPartySection.getByTestId('address-region-select').click()
  await compPartySection.getByRole('option', { name: completingParty.mailingAddress.region }).click()
  await compPartySection.getByTestId('mailingAddress.postalCode').fill(completingParty.mailingAddress.postalCode)
  await compPartySection.getByTestId('address-location-description').fill(completingParty.mailingAddress.locationDescription)
  // add host contact info
  await compPartySection.getByTestId('phone-countryCode').fill(completingParty.phone.countryCode!)
  await compPartySection.getByRole('option').first().click()
  await compPartySection.getByTestId('phone-number').fill(completingParty.phone.number)
  await compPartySection.getByTestId('phone-extension').fill(completingParty.phone.extension!)
  await compPartySection.getByTestId('host-owner-fax-number').fill(completingParty.faxNumber!)
  await compPartySection.getByTestId('host-owner-email').fill(completingParty.emailAddress)
  // done filling completing party
  await compPartySection.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(compPartySection).not.toBeVisible() // form should be hidden
  await expect(page.locator('table').filter({ hasText: 'Person completing form' })).toBeVisible() // completing party should be added to table

  // add cohost
  await page.getByRole('button', { name: 'Add an Individual', exact: true }).click()
  await expect(page.locator('section').filter({ hasText: 'Add an Individual' })).toBeVisible()
  const cohostSection = page.locator('section').filter({ hasText: 'Add an Individual' })
  // fill cohost name and role
  await cohostSection.getByTestId('host-owner-first-name').fill(cohost.firstName!)
  await cohostSection.getByTestId('host-owner-middle-name').fill(cohost.middleName!)
  await cohostSection.getByTestId('host-owner-last-name').fill(cohost.lastName!)
  await cohostSection.getByTestId('host-owner-preferred-name').fill(cohost.preferredName!)
  await cohostSection.locator('input[type="radio"][value="CO_HOST"]').check()
  // add cohost mailing address
  await cohostSection.getByTestId('host-owner-address-country').click()
  await cohostSection.getByRole('option', { name: 'Canada' }).click()
  await cohostSection.getByTestId('host-owner-address-street').fill(cohost.mailingAddress.street)
  await cohostSection.getByTestId('mailingAddress.city').fill(cohost.mailingAddress.city)
  await cohostSection.getByTestId('address-region-select').click()
  await cohostSection.getByRole('option', { name: cohost.mailingAddress.region }).click()
  await cohostSection.getByTestId('mailingAddress.postalCode').fill(cohost.mailingAddress.postalCode)
  await cohostSection.getByTestId('address-location-description').fill(cohost.mailingAddress.locationDescription)
  // add cohost contact info
  await cohostSection.getByTestId('phone-countryCode').fill(cohost.phone.countryCode!)
  await cohostSection.getByRole('option').first().click()
  await cohostSection.getByTestId('phone-number').fill(cohost.phone.number)
  await cohostSection.getByTestId('phone-extension').fill(cohost.phone.extension!)
  await cohostSection.getByTestId('host-owner-fax-number').fill(cohost.faxNumber!)
  await cohostSection.getByTestId('host-owner-email').fill(cohost.emailAddress)
  // done filling cohost
  await cohostSection.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(cohostSection).not.toBeVisible() // form should be hidden
  await expect(page.locator('table').filter({ hasText: 'Co-host' })).toBeVisible() // cohost party should be added to table

  // add property manager
  await page.getByRole('button', { name: 'Add a Business', exact: true }).click()
  await expect(page.locator('section').filter({ hasText: 'Add a Business' })).toBeVisible()
  const pmSection = page.locator('section').filter({ hasText: 'Add a Business' })
  // add business name, pm role and business number
  await pmSection.getByTestId('host-owner-businessLegalName').fill(propertyManager.businessLegalName)
  await pmSection.locator('input[type="radio"][value="PROPERTY_MANAGER"]').check()
  await pmSection.getByTestId('owner-host-businessNumber').fill(propertyManager.businessNumber)
  // add business address
  await pmSection.getByTestId('host-owner-address-country').click()
  await pmSection.getByRole('option', { name: 'Canada' }).click()
  await pmSection.getByTestId('host-owner-address-street').fill(propertyManager.mailingAddress.street)
  await pmSection.getByTestId('mailingAddress.city').fill(propertyManager.mailingAddress.city)
  await pmSection.getByTestId('address-region-select').click()
  await pmSection.getByRole('option', { name: propertyManager.mailingAddress.region }).click()
  await pmSection.getByTestId('mailingAddress.postalCode').fill(propertyManager.mailingAddress.postalCode)
  await pmSection.getByTestId('address-location-description').fill(propertyManager.mailingAddress.locationDescription)
  // add contact info and individuals name
  await pmSection.getByTestId('host-owner-first-name').fill(propertyManager.firstName!)
  await pmSection.getByTestId('host-owner-middle-name').fill(propertyManager.middleName!)
  await pmSection.getByTestId('host-owner-last-name').fill(propertyManager.lastName!)
  await pmSection.getByTestId('host-owner-preferred-name').fill(propertyManager.preferredName!)
  await pmSection.getByTestId('phone-countryCode').fill(propertyManager.phone.countryCode!)
  await pmSection.getByRole('option').first().click()
  await pmSection.getByTestId('phone-number').fill(propertyManager.phone.number)
  await pmSection.getByTestId('phone-extension').fill(propertyManager.phone.extension!)
  await pmSection.getByTestId('host-owner-fax-number').fill(propertyManager.faxNumber!)
  await pmSection.getByTestId('host-owner-email').fill(propertyManager.emailAddress)
  // done filling property manager
  await pmSection.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(pmSection).not.toBeVisible() // form should be hidden
  await expect(page.locator('table').filter({ hasText: 'Property Manager' })).toBeVisible() // Property Manager should be added to table
  page.getByRole('button', { name: 'Add Supporting Information', exact: true }).click()
  await expect(getH2(page)).toContainText('Add Supporting Information')
}

export const completeStep3 = async (
  page: Page,
  requiredDocs: Array<{ option: string, filename: string }>,
  blInfo: { businessLicense: string, businessLicenseExpiryDate: string },
  docsChecklistAssertions: () => Promise<void>
) => {
  await expect(getH2(page)).toContainText('Add Supporting Information')

  // complete checklist assertions
  await docsChecklistAssertions()

  // upload required docs
  if (requiredDocs.length) {
    await expect(page.getByText('File Upload')).toBeVisible()
    const fileSection = page.locator('section').filter({ hasText: 'File Upload' })
    await uploadDocuments(page, fileSection, requiredDocs)
  }

  // fill out business licence info
  const blSection = page.locator('section').filter({ hasNotText: 'File Upload', hasText: 'Local Government Business Licence' })
  await blSection.getByTestId('property-business-license').fill(blInfo.businessLicense)
  await blSection.getByTestId('date-select').fill(blInfo.businessLicenseExpiryDate)

  // finalize step 3
  page.getByRole('button', { name: 'Review and Confirm', exact: true }).click()
  await expect(getH2(page)).toContainText('Review and Confirm')
}

export const completeStep4 = async (
  page: Page,
  nickname: string,
  lookupAddress: string | {
    streetNumber: string;
    streetName: string;
    city: string;
    postalCode: string;
  },
  propertyType: string,
  // typeOfSpace: string,
  rentalUnitSetupType: string,
  numberOfRooms: string,
  ownershipType: string,
  testPid: string,
  completingParty: HostOwner,
  cohost: HostOwner,
  propertyManager: HostOwner,
  requiredDocs: Array<{ option: string, filename: string }>,
  blInfo: { businessLicense: string, businessLicenseExpiryDate: string },
  hasPrDeclaration: boolean
) => {
  await expect(getH2(page)).toContainText('Review and Confirm')

  // rental unit details
  const strSection = page.locator('section').filter({ hasText: 'Short-Term Rental' }).first()
  await expect(strSection).toContainText(nickname)
  await assertLookupAddress(strSection, lookupAddress)
  await expect(strSection).toContainText(propertyType)
  await expect(strSection).toContainText(rentalUnitSetupType)
  await expect(strSection).toContainText(numberOfRooms)
  await expect(strSection).toContainText(ownershipType)
  await expect(strSection).toContainText(testPid)

  // individuals and business
  const ibSection = page.locator('section').filter({ hasText: 'Individuals and Businesses' })
  // completing party
  await expect(ibSection).toContainText(completingParty.dateOfBirth)
  await expect(ibSection).toContainText(completingParty.emailAddress)
  await expect(ibSection).toContainText(completingParty.mailingAddress.street)
  await expect(ibSection).toContainText(completingParty.mailingAddress.postalCode)
  await expect(ibSection).toContainText(completingParty.taxNumber)
  // cohost
  await expect(ibSection).toContainText(cohost.firstName!)
  await expect(ibSection).toContainText(cohost.lastName)
  await expect(ibSection).toContainText(cohost.emailAddress)
  await expect(ibSection).toContainText(cohost.mailingAddress.street)
  await expect(ibSection).toContainText(cohost.mailingAddress.postalCode)
  // property manager
  await expect(ibSection).toContainText(propertyManager.firstName!)
  await expect(ibSection).toContainText(propertyManager.lastName)
  await expect(ibSection).toContainText(propertyManager.emailAddress)
  await expect(ibSection).toContainText(propertyManager.mailingAddress.street)
  await expect(ibSection).toContainText(propertyManager.mailingAddress.postalCode)
  await expect(ibSection).toContainText(propertyManager.businessNumber)
  await expect(ibSection).toContainText(propertyManager.businessLegalName)

  // supporting info section
  const supportingInfoSection = page.locator('section').filter({ hasText: 'Supporting Information' })
  if (requiredDocs.length) {
    requiredDocs.forEach(async (item) => {
      await expect(supportingInfoSection).toContainText(item.option)
    })
  }
  await expect(supportingInfoSection).toContainText(blInfo.businessLicense)
  await expect(supportingInfoSection).toContainText(blInfo.businessLicenseExpiryDate)

  // confirmation section includes pr declaration ?
  await expect(page.getByTestId('section-agreed-to-rental-act').locator('ol li')).toHaveCount(hasPrDeclaration ? 4 : 3)

  // Check certify checkboxes
  await page.getByTestId('agreedToRentalAct-checkbox').check()
  await page.getByTestId('agreedToSubmit-checkbox').check()

  // finalize and submit
  await page.getByRole('button', { name: 'Submit & Pay' }).click()
  await page.waitForURL('**/dashboard/**')
  await expect(page.getByTestId('h1')).toContainText(nickname)
  await expect(page).toHaveURL(/.*\/dashboard\/.*/)
}

export const assertDashboardDetailsView = async (
  page: Page,
  nickname: string,
  lookupAddress: string | {
    streetNumber: string;
    streetName: string;
    city: string;
    postalCode: string;
  },
  propertyType: string,
  typeOfSpace: string,
  rentalUnitSetupType: string,
  numberOfRooms: string,
  completingParty: HostOwner,
  cohost: HostOwner,
  propertyManager: HostOwner,
  requiredDocs: Array<{ option: string, filename: string }>,
  blInfo: { businessLicense: string, businessLicenseExpiryDate: string }
) => {
  page.waitForURL('**/dashboard/**')
  await expect(page.getByTestId('h1')).toContainText(nickname)
  await expect(page).toHaveURL(/.*\/dashboard\/.*/)

  // assert header details
  const detailsHeader = page.getByTestId('connect-details-header')
  await expect(detailsHeader).toContainText(nickname)
  await assertLookupAddress(detailsHeader, lookupAddress)
  await expect(detailsHeader).toContainText('Pending Approval')
  await expect(detailsHeader.getByRole('button', { name: 'Download Receipt', exact: true })).toBeVisible()

  // assert todos
  const todoSection = page.locator('section').filter({ hasText: 'To Do' })
  await expect(todoSection).toContainText('You don’t have anything to do yet')
  await expect(todoSection).toContainText('Filings that require your attention will appear here')

  // str section
  const strSection = page.locator('section').filter({ hasText: 'Short-Term Rental' }).first()
  await expect(strSection).toContainText(nickname)
  if (typeof lookupAddress === 'string') {
    await expect(strSection).toContainText(lookupAddress)
  } else {
    await expect(strSection).toContainText(lookupAddress.streetNumber)
    await expect(strSection).toContainText(lookupAddress.streetName)
    await expect(strSection).toContainText(lookupAddress.city)
    await expect(strSection).toContainText(lookupAddress.postalCode)
  }
  await expect(strSection).toContainText(propertyType)
  await expect(strSection).toContainText(typeOfSpace)
  await expect(strSection).toContainText(rentalUnitSetupType)
  await expect(strSection).toContainText(numberOfRooms)

  // supporting info section
  const supportingInfoSection = page.locator('section').filter({ hasText: 'Supporting Information' })
  if (requiredDocs.length) {
    requiredDocs.forEach(async (item) => {
      await expect(supportingInfoSection).toContainText(item.option)
    })
  }
  await expect(supportingInfoSection).toContainText(blInfo.businessLicense)
  await expect(supportingInfoSection).toContainText(blInfo.businessLicenseExpiryDate)

  // individuals and business
  const ibSection = page.locator('section').filter({ hasText: 'Individuals and Businesses' })
  // completing party
  await expect(ibSection).toContainText(completingParty.dateOfBirth)
  await expect(ibSection).toContainText(completingParty.emailAddress)
  await expect(ibSection).toContainText(completingParty.mailingAddress.street)
  await expect(ibSection).toContainText(completingParty.mailingAddress.postalCode)
  await expect(ibSection).toContainText(completingParty.taxNumber)
  await expect(ibSection).toContainText(completingParty.preferredName!)
  // cohost
  await expect(ibSection).toContainText(cohost.firstName!)
  await expect(ibSection).toContainText(cohost.lastName)
  await expect(ibSection).toContainText(cohost.preferredName!)
  await expect(ibSection).toContainText(cohost.emailAddress)
  await expect(ibSection).toContainText(cohost.mailingAddress.street)
  await expect(ibSection).toContainText(cohost.mailingAddress.postalCode)
  // property manager
  await expect(ibSection).toContainText(propertyManager.firstName!)
  await expect(ibSection).toContainText(propertyManager.lastName)
  await expect(ibSection).toContainText(propertyManager.preferredName!)
  await expect(ibSection).toContainText(propertyManager.emailAddress)
  await expect(ibSection).toContainText(propertyManager.mailingAddress.street)
  await expect(ibSection).toContainText(propertyManager.mailingAddress.postalCode)
  await expect(ibSection).toContainText(propertyManager.businessNumber)
  await expect(ibSection).toContainText(propertyManager.businessLegalName)
}

export const assertDashboardListView = async (
  page: Page,
  nickname: string,
  lookupAddress: string | {
    streetNumber: string;
    streetName: string;
    city: string;
    postalCode: string;
  }
) => {
  page.waitForURL('**/dashboard/**')
  await expect(page.getByTestId('h1')).toContainText(nickname)
  await expect(page).toHaveURL(/.*\/dashboard\/.*/)

  // go back to list view
  await page.getByRole('link', { name: 'My Short-Term Rental Registry' }).click()
  await expect(page.getByTestId('h1')).toContainText('My Short-Term Rental Registry')
  const listSection = page.locator('section').filter({ hasText: 'My Short-Term Rentals' })
  await expect(listSection).toContainText(nickname)
  await assertLookupAddress(listSection, lookupAddress, false)
}
