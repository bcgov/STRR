/* eslint-disable max-len */
import { test, expect, type Page } from '@playwright/test'
import { config as dotenvConfig } from 'dotenv'
import { OwnerRole } from '../../../app/enums/owner-role'
import { OwnerType } from '../../../app/enums/owner-type'
import { getFakeOwner, getFakePropertyNickname, getFakePid, getFakeBlInfo } from '../test-utils/faker'
import { loginMethods } from '../test-utils/constants'
import { LoginSource } from '../enums/login-source'
import {
  getH2,
  getPropertyRequirementsList
} from '../test-utils/getters'
import { fillStep2 } from '../test-utils/fill-form'
// load default env
dotenvConfig()

loginMethods.forEach((loginMethod) => {
  test.describe(`Host Smoke - Scenario 6 - Manual Input - NoBL_NoPR_NotProh_NotExempt - ${loginMethod}`, () => {
    // address constants
    const nickname = getFakePropertyNickname()
    const unitAddress = {
      streetNumber: '5300',
      streetName: '44A Ave NW',
      city: 'Chetwynd',
      postalCode: 'V0C 1J0'
    }
    // unit details contants
    const propertyType = 'Single Family Home'
    const typeOfSpace = 'Entire home (guests have the entire place to themselves)'
    const rentalUnitSetupType = "This unit is the host's principal residence"
    const numberOfRooms = '4'
    const ownershipType = 'Owner'
    const testPid = getFakePid()
    const completingParty = getFakeOwner(OwnerType.INDIVIDUAL, OwnerRole.HOST, true)
    const cohost = getFakeOwner(OwnerType.INDIVIDUAL, OwnerRole.CO_HOST, false)
    const propertyManager = getFakeOwner(OwnerType.BUSINESS, OwnerRole.PROPERTY_MANAGER, false)
    const blInfo = getFakeBlInfo()

    let page: Page

    const storageStatePath = loginMethod === LoginSource.BCSC
      ? 'tests/e2e/.auth/bcsc-user.json'
      : 'tests/e2e/.auth/bceid-user.json'

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: storageStatePath }) // used saved auth state
      page = await context.newPage()
    })

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
      await expect(getH2(page)).toContainText('Define Your Short-Term Rental')

      // fill in rental unit nickname
      await page.getByTestId('rental-unit-address-nickname').fill(nickname)

      // enter address manually
      await page.getByRole('button', { name: 'Enter the residental address manually' }).click()
      await page.getByTestId('rental-property-address-streetNumber').fill(unitAddress.streetNumber)
      await page.getByTestId('rental-property-address-streetName').fill(unitAddress.streetName)
      await page.getByTestId('address.city').fill(unitAddress.city)
      await page.getByTestId('address.postalCode').fill(unitAddress.postalCode)
      await page.getByRole('button', { name: 'Done', exact: true }).click()
      await page.getByTestId('property-requirements-section').waitFor({ state: 'visible', timeout: 10000 }) // wait for autocomplete requirements to be displayed
      await expect(page.getByTestId('alert-pr-exempt')).toBeVisible()

      // assert unit requirements list not displayed
      await expect(getPropertyRequirementsList(page)).not.toBeVisible() // requirements list should now be visible

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
    })

    test('smoke test - Application Step 2', async () => {
      // check for step 2 content
      await expect(getH2(page)).toContainText('Individuals and Businesses')

      // complete step 2
      await fillStep2(page, completingParty, cohost, propertyManager)

      // finalize step 2
      page.getByRole('button', { name: 'Add Supporting Documentation', exact: true }).click()
      await expect(getH2(page)).toContainText('Add Supporting Documentation')
    })

    test('smoke test - Application Step 3', async () => {
      // check and fill step 3 - supporting documents
      await expect(getH2(page)).toContainText('Add Supporting Documentation')

      // requirements checklist should not be displayed
      await expect(page.getByTestId('required-docs-checklist')).not.toBeVisible()

      // no docs required alert should be visible
      await expect(page.getByTestId('alert-no-docs-required')).toBeVisible()

      // fill out business licence info
      const blSection = page.locator('section').filter({ hasNotText: 'File Upload', hasText: 'Local Government Business License' })
      await blSection.getByTestId('property-business-license').fill(blInfo.businessLicense)
      await blSection.getByTestId('date-select').fill(blInfo.businessLicenseExpiryDate)

      // finalize step 3
      page.getByRole('button', { name: 'Review and Confirm', exact: true }).click()
      await expect(getH2(page)).toContainText('Review and Confirm')
    })

    test('smoke test - Application Step 4', async () => {
      // check and fill step 4 - review and submit
      await expect(getH2(page)).toContainText('Review and Confirm')

      // rental unit details
      const strSection = page.locator('section').filter({ hasText: 'Short-Term Rental' }).first()
      await expect(strSection).toContainText(nickname)
      await expect(strSection).toContainText(unitAddress.streetNumber)
      await expect(strSection).toContainText(unitAddress.streetName)
      await expect(strSection).toContainText(unitAddress.city)
      await expect(strSection).toContainText(unitAddress.postalCode)
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
      await expect(supportingInfoSection).toContainText(blInfo.businessLicense)
      await expect(supportingInfoSection).toContainText(blInfo.businessLicenseExpiryDate)

      // confirmation section should NOT include pr declaration = 3 items total
      await expect(page.getByTestId('section-agreed-to-rental-act').locator('ol li')).toHaveCount(3)

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
      await expect(detailsHeader).toContainText(unitAddress.streetName)
      await expect(detailsHeader).toContainText('Pending Approval')
      await expect(detailsHeader.getByRole('button', { name: 'Download Receipt', exact: true })).toBeVisible()

      // assert todos
      const todoSection = page.locator('section').filter({ hasText: 'To Do' })
      await expect(todoSection).toContainText('You don’t have anything to do yet')
      await expect(todoSection).toContainText('Filings that require your attention will appear here')

      // str section
      const strSection = page.locator('section').filter({ hasText: 'Short-Term Rental' }).first()
      await expect(strSection).toContainText(nickname)
      await expect(strSection).toContainText(unitAddress.streetNumber)
      await expect(strSection).toContainText(unitAddress.streetName)
      await expect(strSection).toContainText(unitAddress.city)
      await expect(strSection).toContainText(unitAddress.postalCode)
      await expect(strSection).toContainText(propertyType)
      await expect(strSection).toContainText(typeOfSpace)
      await expect(strSection).toContainText(rentalUnitSetupType)
      await expect(strSection).toContainText(numberOfRooms)

      // supporting info section
      const supportingInfoSection = page.locator('section').filter({ hasText: 'Supporting Information' })
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
      await expect(listSection).toContainText(unitAddress.streetNumber)
      await expect(listSection).toContainText(unitAddress.streetName)
      await expect(listSection).toContainText(unitAddress.city)
    })
  })
})
