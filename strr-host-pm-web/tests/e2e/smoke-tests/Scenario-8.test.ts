/* eslint-disable max-len */
import { expect, test } from '@playwright/test'
import { OwnerRole } from '../../../app/enums/owner-role'
import { OwnerType } from '../../../app/enums/owner-type'
import {
  assertDashboardDetailsView,
  assertDashboardListView,
  chooseAccount,
  completeStep1,
  completeStep2,
  completeStep3,
  completeStep4,
  getFakeBlInfo,
  getFakeOwner,
  getFakePid,
  getFakePropertyNickname,
  getPropertyRequirementsList,
  loginMethods
} from '../test-utils'
import { enI18n } from '~~/tests/mocks/i18n'

// pull text from i18n keys instead of hard coding, this will only need to be updated if the i18n key changes
const i18nText = enI18n.global.messages.value['en-CA']

loginMethods.forEach((loginMethod) => {
  test.describe(`Host Smoke - Scenario 8 - Manual Input - Address Not Found - ${loginMethod}`, () => {
    // use saved login state
    test.use({ storageState: `tests/e2e/.auth/${loginMethod.toLowerCase()}-user.json` })

    // create test data
    // address constants
    const nickname = getFakePropertyNickname()
    const lookupAddress = {
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

    test('Complete Application Flow', async ({ page }) => {
      // Choose Account
      await chooseAccount(page, loginMethod)

      // Complete Application Step 1
      await completeStep1(
        page,
        lookupAddress,
        nickname,
        propertyType,
        typeOfSpace,
        rentalUnitSetupType,
        numberOfRooms,
        ownershipType,
        testPid,
        async () => {
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
        }
      )

      // Complete Step 2
      await completeStep2(page, completingParty, cohost, propertyManager)

      // Complete Step 3
      await completeStep3(
        page,
        requiredDocs,
        async () => {
          const potentialDocsList = page.getByTestId('potential-docs-checklist').locator('ul')
          await expect(potentialDocsList.locator('li')).toHaveCount(2)
          await expect(potentialDocsList).toContainText('Proof of principal residence')
          await expect(potentialDocsList).toContainText('Local government short-term rental business licence')
        },
        blInfo
      )

      // Complete Step 4
      await completeStep4(
        page,
        nickname,
        lookupAddress,
        propertyType,
        rentalUnitSetupType,
        numberOfRooms,
        ownershipType,
        testPid,
        completingParty,
        cohost,
        propertyManager,
        requiredDocs,
        true,
        blInfo
      )

      // Assert Dashboard Details View
      await assertDashboardDetailsView(
        page,
        nickname,
        lookupAddress,
        propertyType,
        typeOfSpace,
        rentalUnitSetupType,
        numberOfRooms,
        completingParty,
        cohost,
        propertyManager,
        requiredDocs,
        blInfo
      )

      // Assert Dashboard List View
      await assertDashboardListView(
        page,
        nickname,
        lookupAddress
      )
    })
  })
})
