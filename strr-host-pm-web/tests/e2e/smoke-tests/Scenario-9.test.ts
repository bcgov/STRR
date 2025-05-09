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
  test.describe(`Host Smoke - Scenario 9 - NoBL_YesPR_NotProh_Exempt - ${loginMethod}`, () => {
    // use saved login state
    test.use({ storageState: `tests/e2e/.auth/${loginMethod.toLowerCase()}-user.json` })

    // create test data
    // address constants
    const nickname = getFakePropertyNickname()
    const lookupAddress = '2618 Panorama Dr'
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
    const requiredDocs = [
      { option: i18nText.form.pr.docType.BCSC, filename: 'fake-bc-services-card' }, // 'British Columbia Services Card'
      { option: i18nText.form.pr.docType.PROPERTY_ASSESSMENT_NOTICE, filename: 'fake-property-assessment-notice' }, // 'Property Assessment Notice'
      { option: i18nText.form.pr.docType.HOG_DECLARATION, filename: 'fake-home-owner-grant' } // 'Home Owner Grant'
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
          // assert unit requirements list shows principal residence and business licence
          await expect(getPropertyRequirementsList(page)).toBeVisible() // requirements list should now be visible
          await expect(getPropertyRequirementsList(page).getByRole('button', { name: 'Principal residence' })).toBeVisible()
          await expect(getPropertyRequirementsList(page).getByRole('button', { name: 'Business Licence' })).toBeVisible()
          await page.getByRole('checkbox', { name: i18nText.text.businessLicNotRequired }).click()
          await page.getByRole('radio', { name: i18nText.label.blExemptionReasonOver30 }).click()
        }
      )

      // Complete Step 2
      await completeStep2(page, completingParty, cohost, propertyManager)

      // Complete Step 3
      await completeStep3(
        page,
        requiredDocs,
        async () => {
          // requirements checklist should have 2 items (proof of pr + business license only)
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
        requiredDocs
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
