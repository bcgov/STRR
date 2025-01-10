import { test, expect, type Page } from '@playwright/test'
import {
  loginMethods,
  getH2,
  completeLogin,
  chooseAccount
} from '../test-utils'

loginMethods.forEach((loginMethod) => {
  test.describe(`Host Smoke - Scenario 2 - NoBL_NoPR_NotProh_YesExempt - ${loginMethod}`, () => {
    // address constants
    const lookupAddress = '6-2727 Lakeshore Rd'

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

      // enter address autocomplete
      await page.locator('#rental-property-address-lookup-street').click()
      await page.keyboard.type(lookupAddress, { delay: 100 }) // using .fill() doesnt trigger canada post api
      await page.getByRole('option', { name: lookupAddress }).click() // 'lakeshore road'
      await page.getByTestId('property-requirements-section').waitFor({ state: 'visible', timeout: 10000 }) // wait for autocomplete requirements to be displayed

      // str prohibited alert should be visible
      await expect(page.getByTestId('alert-str-exempt')).toBeVisible()
      await expect(page.getByTestId('alert-str-exempt')).toContainText('Registration Not Required')
      await expect(page.getByTestId('btn-exit-registration')).toBeVisible()
      await expect(page.getByTestId('btn-continue-registration')).not.toBeVisible()
    })
  })
})
