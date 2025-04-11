/* eslint-disable max-len */
import { expect, test } from '@playwright/test'
import { enI18n } from '~~/tests/mocks/i18n'
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
  loginMethods,
  strataHotelCategory
} from '../test-utils'
// pull text from i18n keys instead of hard coding, this will only need to be updated if the i18n key changes
const i18nText = enI18n.global.messages.value['en-CA']

console.log('[DEBUG] loginMethods =', loginMethods)
loginMethods.forEach((loginMethod) => {
  test.describe(`Host Smoke - Scenario 10 - YesBL_NoPR_NotProh_Exempt_StrataHotel - ${loginMethod}`, () => {
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
    const blInfo = getFakeBlInfo()
    const requiredDocs = [
      { option: i18nText.form.pr.docType.LOCAL_GOVT_BUSINESS_LICENSE, filename: 'fake-business-licence' }, // 'Local Government Business License'
      { option: i18nText.form.pr.docType.STRATA_HOTEL_DOCUMENTATION, filename: 'fake-strata-hotel-docs' } // 'Strata Hotel Documentation'
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
          await page.getByLabel(i18nText.text.thisPropIsExempt).check()
          await page.getByLabel(i18nText.label.exemptionReasonCode.STRATA_HOTEL).check()
          await page.getByLabel(strataHotelCategory.FULL_SERVICE).check()
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
          // requirements checklist should have 2 items (proof of pr + business license only)
          const requiredDocsList = page.getByTestId('required-docs-checklist').locator('ul')
          await expect(requiredDocsList.locator('li')).toHaveCount(2)
          await expect(requiredDocsList).toContainText('Supporting strata-titled hotel or motel documentation')
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
        false
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
