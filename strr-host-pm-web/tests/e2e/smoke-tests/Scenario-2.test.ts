import { test, expect, type Page } from '@playwright/test'
import { config as dotenvConfig } from 'dotenv'
import { loginMethods } from '../test-utils/constants'
import { LoginSource } from '../enums/login-source'
import {
  getH2
} from '../test-utils/getters'
// load default env
dotenvConfig()

loginMethods.forEach((loginMethod) => {
  test.describe(`Host Smoke - Scenario 2 - NoBL_NoPR_NoProh_YesExempt - ${loginMethod}`, () => {
    // address constants
    const lookupAddress = '6-2727 Lakeshore Rd'

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
