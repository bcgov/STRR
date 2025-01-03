/* eslint-disable max-len */
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { test, expect, type Page } from '@playwright/test'
import { config as dotenvConfig } from 'dotenv'
import { OwnerRole } from '../../app/enums/owner-role'
import { OwnerType } from '../../app/enums/owner-type'
import { getFakeOwner, getFakePropertyNickname, getFakePid, getFakeBlInfo } from './test-utils/faker'
import { uploadDocuments } from './test-utils/upload-documents'
// load default env
dotenvConfig()
const currentDir = dirname(fileURLToPath(import.meta.url))

enum LoginSource {
  BCSC = 'BCSC',
  BCEID = 'BCEID'
}

async function authSetup (loginMethod: LoginSource, page: Page) {
  const baseURL = process.env.NUXT_BASE_URL!

  await page.goto(baseURL + 'en-CA/auth/login')

  if (loginMethod === LoginSource.BCSC) {
    const username = process.env.PLAYWRIGHT_TEST_BCSC_USERNAME!
    const password = process.env.PLAYWRIGHT_TEST_BCSC_PASSWORD!
    await page.getByRole('button', { name: 'Continue with BC Services Card' }).click()
    await page.getByLabel('Log in with Test with').click()
    await page.getByLabel('Email or username').fill(username)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Continue' }).click()
  } else if (loginMethod === LoginSource.BCEID) {
    const username = process.env.PLAYWRIGHT_TEST_BCEID_USERNAME!
    const password = process.env.PLAYWRIGHT_TEST_BCEID_PASSWORD!
    await page.getByRole('button', { name: 'Continue with BCeID' }).click()
    await page.locator('#user').fill(username)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Continue' }).click()
  }

  await page.waitForURL(baseURL + '**')
  await page.context().storageState({ path: 'tests/e2e/.auth/user.json' })
}

// Strata allows bcsc and bceid
const loginMethods = [LoginSource.BCSC, LoginSource.BCEID]

loginMethods.forEach((loginMethod) => {
  test.describe(`STRR Host Smoke Test - Scenario 3 - ${loginMethod}`, () => { // TODO - scenario number
    // address constants
    const nickname = getFakePropertyNickname()
    const lookupAddress = '2618 Panorama Dr'
    // unit details contants
    const propertyType = 'Single Family Home'
    const typeOfSpace = 'Entire home (guests have the entire place to themselves)'
    const rentalUnitSetupType = "This unit is the host's principal residence"
    const numberOfRooms = '4'
    const ownershipType = 'Owner'
    const testPid = getFakePid()
    const completingParty = getFakeOwner(OwnerType.INDIVIDUAL, OwnerRole.HOST, true)
    const cohost = getFakeOwner(OwnerType.INDIVIDUAL, OwnerRole.CO_HOST, false)
    const propertManager = getFakeOwner(OwnerType.BUSINESS, OwnerRole.PROPERTY_MANAGER, false)
    const blInfo = getFakeBlInfo()
    const requiredDocs = [
      { option: 'Local Government Business License', filename: 'fake-business-licence' },
      { option: 'British Columbia Services Card', filename: 'fake-bc-services-card' },
      { option: 'Property Assessment Notice', filename: 'fake-property-assessment-notice' }
    ]

    let page: Page

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: undefined }) // start fresh
      page = await context.newPage()

      // get auth state
      await authSetup(loginMethod, page)

      await page.goto('./') // start at home page // uses base url set in playwright config
    })

    const getH2 = () => page.getByTestId('h2').first()

    test('smoke test - Select Account', async () => {
      page.goto('./en-CA/auth/account/choose-existing') // should be redirected to select account page
      await expect(page.getByTestId('h1')).toContainText('Existing Account Found')

      if (loginMethod === LoginSource.BCSC) {
        const accountName = process.env.PLAYWRIGHT_TEST_BCSC_PREMIUM_ACCOUNT_NAME
        await page.getByLabel(`Use this Account, ${accountName}`).click() // select premium account
      } else {
        const accountName = process.env.PLAYWRIGHT_TEST_BCEID_PREMIUM_ACCOUNT_NAME
        await page.getByLabel(`Use this Account, ${accountName}`).click() // select premium account
      }
      page.waitForURL('**/dashboard/**') // should be redirect to dashboard
    })

    test('smoke test - Application Step 1', async () => {
      page.goto('./en-CA/application') // go to application
      page.waitForURL('**/application')
      // check for step 1 content
      await expect(page.getByTestId('h1')).toContainText('Short-Term Rental Registration')
      await expect(getH2()).toContainText('Define Your Short-Term Rental')

      // fill in rental unit nickname
      await page.getByTestId('rental-unit-address-nickname').fill(nickname)

      // enter address autocomplete
      await page.locator('#rental-property-address-lookup-street').click()
      await page.keyboard.type(lookupAddress, { delay: 100 }) // using .fill() doesnt trigger canada post api
      await page.getByRole('option', { name: lookupAddress }).click() // 'Panorama DrCoquitlam, BC, V3E 2W1'
      await page.getByTestId('property-requirements-section').waitFor({ state: 'visible', timeout: 10000 }) // wait for autocomplete requirements to be displayed

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
      await expect(getH2()).toContainText('Individuals and Businesses')
    })

    test('smoke test - Application Step 2', async () => {
      // check for step 2 content
      await expect(getH2()).toContainText('Individuals and Businesses')

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
      await expect(page.locator('table').filter({ hasText: 'Completing Party' })).toBeVisible() // completing party should be added to table

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
      await pmSection.getByTestId('host-owner-businessLegalName').fill(propertManager.businessLegalName)
      await pmSection.locator('input[type="radio"][value="PROPERTY_MANAGER"]').check()
      await pmSection.getByTestId('owner-host-businessNumber').fill(propertManager.businessNumber)
      // add business address
      await pmSection.getByTestId('host-owner-address-country').click()
      await pmSection.getByRole('option', { name: 'Canada' }).click()
      await pmSection.getByTestId('host-owner-address-street').fill(propertManager.mailingAddress.street)
      await pmSection.getByTestId('mailingAddress.city').fill(propertManager.mailingAddress.city)
      await pmSection.getByTestId('address-region-select').click()
      await pmSection.getByRole('option', { name: propertManager.mailingAddress.region }).click()
      await pmSection.getByTestId('mailingAddress.postalCode').fill(propertManager.mailingAddress.postalCode)
      await pmSection.getByTestId('address-location-description').fill(propertManager.mailingAddress.locationDescription)
      // add contact info and individuals name
      await pmSection.getByTestId('host-owner-first-name').fill(propertManager.firstName!)
      await pmSection.getByTestId('host-owner-middle-name').fill(propertManager.middleName!)
      await pmSection.getByTestId('host-owner-last-name').fill(propertManager.lastName!)
      await pmSection.getByTestId('host-owner-preferred-name').fill(propertManager.preferredName!)
      await pmSection.getByTestId('phone-countryCode').fill(propertManager.phone.countryCode!)
      await pmSection.getByRole('option').first().click()
      await pmSection.getByTestId('phone-number').fill(propertManager.phone.number)
      await pmSection.getByTestId('phone-extension').fill(propertManager.phone.extension!)
      await pmSection.getByTestId('host-owner-fax-number').fill(propertManager.faxNumber!)
      await pmSection.getByTestId('host-owner-email').fill(propertManager.emailAddress)
      // done filling property manager
      await pmSection.getByRole('button', { name: 'Done', exact: true }).click()
      await expect(pmSection).not.toBeVisible() // form should be hidden
      await expect(page.locator('table').filter({ hasText: 'Property Manager' })).toBeVisible() // Property Manager should be added to table

      // finalize step 2
      page.getByRole('button', { name: 'Add Supporting Documentation', exact: true }).click()
      await expect(getH2()).toContainText('Add Supporting Documentation')
    })

    test('smoke test - Application Step 3', async () => {
      // check and fill step 3 - supporting documents
      await expect(getH2()).toContainText('Add Supporting Documentation')

      // upload required docs
      const fileSection = page.locator('section').filter({ hasText: 'File Upload' })
      await uploadDocuments(currentDir, page, fileSection, requiredDocs)

      // fill out business licence info
      const blSection = page.locator('section').filter({ hasNotText: 'File Upload', hasText: 'Local Government Business License' })
      await blSection.getByTestId('property-business-license').fill(blInfo.businessLicense)
      await blSection.getByTestId('date-select').fill(blInfo.businessLicenseExpiryDate)

      // finalize step 3
      page.getByRole('button', { name: 'Review and Confirm', exact: true }).click()
      await expect(getH2()).toContainText('Review and Confirm')
    })

    test('smoke test - Application Step 4', async () => {
      // check and fill step 4 - review and submit
      await expect(getH2()).toContainText('Review and Confirm')

      // rental unit details
      const strSection = page.locator('section').filter({ hasText: 'Short-Term Rental' }).first()
      await expect(strSection).toContainText(nickname)
      await expect(strSection).toContainText(lookupAddress)
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
      await expect(ibSection).toContainText(propertManager.firstName!)
      await expect(ibSection).toContainText(propertManager.lastName)
      await expect(ibSection).toContainText(propertManager.emailAddress)
      await expect(ibSection).toContainText(propertManager.mailingAddress.street)
      await expect(ibSection).toContainText(propertManager.mailingAddress.postalCode)
      await expect(ibSection).toContainText(propertManager.businessNumber)
      await expect(ibSection).toContainText(propertManager.businessLegalName)

      // supporting info section
      const supportingInfoSection = page.locator('section').filter({ hasText: 'Supporting Information' })
      requiredDocs.forEach(async (item) => {
        await expect(supportingInfoSection).toContainText(item.option)
      })
      await expect(supportingInfoSection).toContainText(blInfo.businessLicense)
      await expect(supportingInfoSection).toContainText(blInfo.businessLicenseExpiryDate)

      // Check certify checkboxes
      await page.getByTestId('agreedToRentalAct-checkbox').check()
      await page.getByTestId('agreedToSubmit-checkbox').check()

      // finalize and submit
      await page.getByRole('button', { name: 'Submit & Pay' }).click()
      page.waitForURL('**/dashboard/**')
      await expect(page.getByTestId('h1')).toContainText(nickname)
      await expect(page).toHaveURL(/.*\/dashboard\/.*/)
    })

    test('smoke test - Dashboard Details View', async () => {
      page.waitForURL('**/dashboard/**')
      await expect(page.getByTestId('h1')).toContainText(nickname)
      await expect(page).toHaveURL(/.*\/dashboard\/.*/)

      // assert header details
      const detailsHeader = page.getByTestId('connect-details-header')
      await expect(detailsHeader).toContainText(nickname)
      await expect(detailsHeader).toContainText(lookupAddress)
      await expect(detailsHeader).toContainText('Pending Approval')
      await expect(detailsHeader.getByRole('button', { name: 'Download Receipt', exact: true })).toBeVisible()

      // assert todos
      const todoSection = page.locator('section').filter({ hasText: 'To Do' })
      await expect(todoSection).toContainText('You don’t have anything to do yet')
      await expect(todoSection).toContainText('Filings that require your attention will appear here')

      // str section
      const strSection = page.locator('section').filter({ hasText: 'Short-Term Rental' }).first()
      await expect(strSection).toContainText(nickname)
      await expect(strSection).toContainText(lookupAddress)
      await expect(strSection).toContainText(propertyType)
      await expect(strSection).toContainText(typeOfSpace)
      await expect(strSection).toContainText(rentalUnitSetupType)
      await expect(strSection).toContainText(numberOfRooms)

      // supporting info section
      const supportingInfoSection = page.locator('section').filter({ hasText: 'Supporting Information' })
      requiredDocs.forEach(async (item) => {
        await expect(supportingInfoSection).toContainText(item.option)
      })
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
      await expect(ibSection).toContainText(propertManager.firstName!)
      await expect(ibSection).toContainText(propertManager.lastName)
      await expect(ibSection).toContainText(propertManager.preferredName!)
      await expect(ibSection).toContainText(propertManager.emailAddress)
      await expect(ibSection).toContainText(propertManager.mailingAddress.street)
      await expect(ibSection).toContainText(propertManager.mailingAddress.postalCode)
      await expect(ibSection).toContainText(propertManager.businessNumber)
      await expect(ibSection).toContainText(propertManager.businessLegalName)
    })

    test('smoke test - Dashboard List View', async () => {
      page.waitForURL('**/dashboard/**')
      await expect(page.getByTestId('h1')).toContainText(nickname)
      await expect(page).toHaveURL(/.*\/dashboard\/.*/)

      // go back to list view
      await page.getByRole('link', { name: 'My Short-Term Rental Registry' }).click()
      await expect(page.getByTestId('h1')).toContainText('My Short-Term Rental Registry')
      const listSection = page.locator('section').filter({ hasText: 'My Short-Term Rentals' })
      expect(listSection).toContainText(nickname)
      expect(listSection).toContainText(lookupAddress)
    })
  })
})
