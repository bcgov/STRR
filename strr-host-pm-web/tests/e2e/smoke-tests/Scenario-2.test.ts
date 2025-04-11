import { expect, test } from '@playwright/test'
import {
  chooseAccount,
  getH2,
  loginMethods
} from '../test-utils'

console.log('[DEBUG] loginMethods =', loginMethods)
loginMethods.forEach((loginMethod) => {
  test.describe(`Host Smoke - Scenario 2 - NoBL_NoPR_NotProh_YesExempt - ${loginMethod}`, () => {
    // use saved login state
    test.use({ storageState: `tests/e2e/.auth/${loginMethod.toLowerCase()}-user.json` })

    // create test data
    // address constants
    const lookupAddress = '6-2727 Lakeshore Rd'

    test('Assert Str Exempt Scenario', async ({ page }) => {
      // Choose Account
      await chooseAccount(page, loginMethod)

      // Complete Application Step 1
      await page.goto('./en-CA/application') // go to application
      // check for step 1 content
      await expect(page.getByTestId('h1')).toContainText('Short-Term Rental Registration')
      await expect(getH2(page)).toContainText('Define Your Short-Term Rental')

      // enter address autocomplete
      await page.locator('#rental-property-address-lookup-street').click()
      await page.keyboard.type(lookupAddress, { delay: 100 }) // using .fill() doesnt trigger canada post api
      await page.getByRole('option', { name: lookupAddress }).click() // 'lakeshore road'
      await page.getByTestId('property-requirements-section').waitFor({ state: 'visible', timeout: 30000 }) // wait for autocomplete requirements to be displayed

      // str prohibited alert should be visible
      await expect(page.getByTestId('alert-str-exempt')).toBeVisible()
      await expect(page.getByTestId('alert-str-exempt')).toContainText('Registration Not Required')
      await expect(page.getByTestId('btn-exit-registration')).toBeVisible()
      await expect(page.getByTestId('btn-continue-registration')).not.toBeVisible()
    })
  })
})
