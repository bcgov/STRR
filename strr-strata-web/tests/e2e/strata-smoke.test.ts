import { test } from '@playwright/test'
import {
  getFakeBusinessDetails,
  getFakeContactDetails,
  getFakeStrataDetails,
  loginMethods,
  chooseAccount,
  completeStep1,
  completeStep2,
  completeStep3,
  completeStep4,
  assertDashboardDetailsView,
  assertDashboardListView
} from './test-utils'

loginMethods.forEach((loginMethod) => {
  test.describe(`STRR Strata Smoke Test - ${loginMethod}`, () => {
    // use saved login state
    test.use({ storageState: `tests/e2e/.auth/${loginMethod.toLowerCase()}-user.json` })

    const completingParty = getFakeContactDetails()
    const primaryRep = getFakeContactDetails()
    const secondaryRep = getFakeContactDetails()
    const businessDetails = getFakeBusinessDetails()
    const strataDetails = getFakeStrataDetails()

    test('Complete Application Flow', async ({ page }) => {
      // choose account
      await chooseAccount(page, loginMethod)

      // Complete Application Step 1
      await completeStep1(
        page,
        completingParty,
        primaryRep,
        secondaryRep
      )

      // Complete Application Step 2
      await completeStep2(
        page,
        businessDetails
      )

      // Complete Application Step 3
      await completeStep3(
        page,
        strataDetails
      )

      // Complete Application Step 4
      await completeStep4(
        page,
        completingParty,
        primaryRep,
        secondaryRep,
        businessDetails,
        strataDetails
      )

      // Assert Dashboard Details View
      await assertDashboardDetailsView(
        page,
        completingParty,
        primaryRep,
        secondaryRep,
        businessDetails,
        strataDetails
      )

      // Assert Dashboard List View
      await assertDashboardListView(
        page,
        strataDetails
      )
    })
  })
})
