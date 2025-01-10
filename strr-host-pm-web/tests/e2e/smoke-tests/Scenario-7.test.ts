/* eslint-disable max-len */
import { test, expect } from '@playwright/test'
import { OwnerRole } from '../../../app/enums/owner-role'
import { OwnerType } from '../../../app/enums/owner-type'
import {
  loginMethods,
  getPropertyRequirementsList,
  getFakeOwner,
  getFakePropertyNickname,
  getFakePid,
  getFakeBlInfo,
  chooseAccount,
  completeStep1,
  completeStep2,
  completeStep3,
  completeStep4,
  assertDashboardDetailsView,
  assertDashboardListView
} from '../test-utils'
import { enI18n } from '~~/tests/mocks/i18n'

// pull text from i18n keys instead of hard coding, this will only need to be updated if the i18n key changes
const i18nText = enI18n.global.messages.value['en-CA']

loginMethods.forEach((loginMethod) => {
  test.describe(`Host Smoke - Scenario 7 - YesBL_YesPR_YesProh_NotExempt - ${loginMethod}`, () => {
    // use saved login state
    test.use({ storageState: `tests/e2e/.auth/${loginMethod.toLowerCase()}-user.json` })

    // create test data
    // address constants
    const nickname = getFakePropertyNickname()
    const lookupAddress = '2295 Arbutus Rd'
    // unit details constants
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
          // str prohibited alert should be visible
          await expect(page.getByTestId('alert-str-prohibited')).toBeVisible()
          await expect(page.getByTestId('btn-exit-registration')).toBeVisible()
          await expect(page.getByTestId('btn-continue-registration')).toBeVisible()

          // continue with registration anyways
          await expect(page.getByTestId('form-unit-details')).not.toBeVisible() // form should be hidden by default
          await expect(getPropertyRequirementsList(page)).not.toBeVisible() // requirements list should be hidden by default
          await page.getByTestId('btn-continue-registration').click() // open form
          await expect(page.getByTestId('form-unit-details')).toBeVisible() // form should now be visible
          await expect(getPropertyRequirementsList(page)).toBeVisible() // requirements list should now be visible
          await expect(getPropertyRequirementsList(page).getByRole('button', { name: 'Principal residence' })).toBeVisible()
          await expect(getPropertyRequirementsList(page).getByRole('button', { name: 'Business licence' })).toBeVisible()
        }
      )

      // Complete Step 2
      await completeStep2(page, completingParty, cohost, propertyManager)

      // Complete Step 3
      await completeStep3(
        page,
        requiredDocs,
        blInfo,
        async () => {
          const requiredDocsList = page.getByTestId('required-docs-checklist').locator('ul')
          await expect(requiredDocsList.locator('li')).toHaveCount(2)
          await expect(requiredDocsList).toContainText('Proof of principal residence')
          await expect(requiredDocsList).toContainText('Local government short-term rental business licence')
        }
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
        blInfo,
        true
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
