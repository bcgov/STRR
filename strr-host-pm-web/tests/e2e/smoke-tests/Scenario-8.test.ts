/* eslint-disable max-len */
import { test, expect, type Page } from '@playwright/test'
import { OwnerRole } from '../../../app/enums/owner-role'
import { OwnerType } from '../../../app/enums/owner-type'
import {
  loginMethods,
  getH2,
  getPropertyRequirementsList,
  getFakeOwner,
  getFakePropertyNickname,
  getFakePid,
  getFakeBlInfo,
  uploadDocuments,
  completeLogin,
  chooseAccount,
  fillStep2
} from '../test-utils'
import { enI18n } from '~~/tests/mocks/i18n'

// pull text from i18n keys instead of hard coding, this will only need to be updated if the i18n key changes
const i18nText = enI18n.global.messages.value['en-CA']

loginMethods.forEach((loginMethod) => {
  test.describe(`Host Smoke - Scenario 6 - Manual Input - Address Not Found - ${loginMethod}`, () => {
    // address constants
    const nickname = getFakePropertyNickname()
    const unitAddress = {
      unitNumber: '12',
      streetNumber: '1001',
      streetName: 'Thanos Way',
      city: 'Multiverse',
      postalCode: 'T4N 0S5'
    }
    // unit details contants
    const propertyType = i18nText.propertyType.SINGLE_FAMILY_HOME // 'Single Family Home'
    const typeOfSpace = i18nText.rentalUnitType.ENTIRE_HOME // 'Entire Home (guests rent an entire residence for themselves)'
    const rentalUnitSetupType = i18nText.rentalUnitSetupType.WHOLE_PRINCIPAL_RESIDENCE // "This unit is the host's principal residence or a room within the host's principal residence"
    const numberOfRooms = '4'
    const ownershipType = 'Owner'
    const testPid = getFakePid()
    const completingParty = getFakeOwner(OwnerType.INDIVIDUAL, OwnerRole.HOST, true)
    const cohost = getFakeOwner(OwnerType.INDIVIDUAL, OwnerRole.CO_HOST, false)
    const propertyManager = getFakeOwner(OwnerType.BUSINESS, OwnerRole.PROPERTY_MANAGER, false)
    const blInfo = getFakeBlInfo()
    const requiredDocs = [
      { option: i18nText.form.pr.docType.LOCAL_GOVT_BUSINESS_LICENSE, filename: 'fake-business-licence' }, // 'Local Government Business License'
      { option: i18nText.form.pr.docType.BCSC, filename: 'fake-bc-services-card' }, // 'British Columbia Services Card'
      { option: i18nText.form.pr.docType.PROPERTY_ASSESSMENT_NOTICE, filename: 'fake-property-assessment-notice' } // 'Property Assessment Notice'
    ]

    let page: Page

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: undefined }) // start fresh
      page = await context.newPage()
    })

    test('smoke test - Complete Login', async () => {
      await completeLogin(page, loginMethod)
    })

    test('smoke test - Select Account', async () => {
      await chooseAccount(page, loginMethod)
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
      await page.getByRole('button', { name: 'Enter the residential address manually' }).click()
      await page.getByTestId('rental-property-address-streetNumber').fill(unitAddress.streetNumber)
      await page.getByTestId('rental-property-address-streetName').fill(unitAddress.streetName)
      await page.getByTestId('address.city').fill(unitAddress.city)
      await page.getByTestId('address.postalCode').fill(unitAddress.postalCode)
      await page.getByRole('button', { name: 'Done', exact: true }).click()
      await page.getByTestId('property-requirements-section').waitFor({ state: 'visible', timeout: 10000 }) // wait for autocomplete requirements to be displayed

      // address not found alert should be displayed
      await expect(page.getByTestId('alert-address-not-found')).toBeVisible()

      // continue with registration anyways
      await expect(page.getByTestId('form-unit-details')).not.toBeVisible() // form should be hidden by default
      await expect(getPropertyRequirementsList(page)).not.toBeVisible() // requirements list should be hidden by default
      await page.getByTestId('btn-continue-registration').click() // open form
      await expect(page.getByTestId('form-unit-details')).toBeVisible() // form should now be visible
      await expect(getPropertyRequirementsList(page)).toBeVisible() // requirements list should now be visible
      await expect(getPropertyRequirementsList(page).getByRole('button', { name: 'Principal residence' })).toBeVisible()
      await expect(getPropertyRequirementsList(page).getByRole('button', { name: 'Business Licence' })).toBeVisible()

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
      page.getByRole('button', { name: 'Add Supporting Information', exact: true }).click()
      await expect(getH2(page)).toContainText('Add Supporting Information')
    })

    test('smoke test - Application Step 3', async () => {
      // check and fill step 3 - supporting documents
      await expect(getH2(page)).toContainText('Add Supporting Information')

      // requirements checklist should have 2 items (proof of pr + business license only)
      const potentialDocsList = page.getByTestId('potential-docs-checklist').locator('ul')
      await expect(potentialDocsList.locator('li')).toHaveCount(2)
      await expect(potentialDocsList).toContainText('Proof of principal residence')
      await expect(potentialDocsList).toContainText('Local government short-term rental business licence')

      // upload required docs
      const fileSection = page.locator('section').filter({ hasText: 'File Upload' })
      await uploadDocuments(page, fileSection, requiredDocs)

      // fill out business licence info
      const blSection = page.locator('section').filter({ hasNotText: 'File Upload', hasText: 'Local Government Business Licence' })
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
      requiredDocs.forEach(async (item) => {
        await expect(supportingInfoSection).toContainText(item.option)
      })
      await expect(supportingInfoSection).toContainText(blInfo.businessLicense)
      await expect(supportingInfoSection).toContainText(blInfo.businessLicenseExpiryDate)

      // confirmation section should include pr declaration = 4 items total
      await expect(page.getByTestId('section-agreed-to-rental-act').locator('ol li')).toHaveCount(4)

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
