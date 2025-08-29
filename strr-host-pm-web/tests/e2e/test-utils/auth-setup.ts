import { type Browser, chromium, type Page } from '@playwright/test'
import { LoginSource } from '../enums/login-source'
import { generateOTP } from './generate-otp'

export async function authSetup (
  loginMethod: LoginSource,
  storagePath: string
) {
  // launch browser and create page context
  const browser: Browser = await chromium.launch()
  const context = await browser.newContext()
  const page: Page = await context.newPage()

  const baseUrl = process.env.NUXT_BASE_URL!
  const username = loginMethod === LoginSource.BCSC
    ? process.env.PLAYWRIGHT_TEST_BCSC_USERNAME!
    : process.env.PLAYWRIGHT_TEST_BCEID_USERNAME!
  const password = loginMethod === LoginSource.BCSC
    ? process.env.PLAYWRIGHT_TEST_BCSC_PASSWORD!
    : process.env.PLAYWRIGHT_TEST_BCEID_PASSWORD!
  const environment = process.env.NUXT_ENVIRONMENT_HEADER!.toLowerCase()
  const otpSecret = process.env.PLAYWRIGHT_TEST_BCEID_OTP_SECRET!

  await page.goto(baseUrl + 'en-CA/auth/login', { waitUntil: 'load', timeout: 60000 })

  if (loginMethod === LoginSource.BCSC) {
    await page.getByRole('button', { name: 'Continue with BC Services Card' }).click()
    await page.getByLabel('Log in with Test with').click()
    await page.getByLabel('Email or username').fill(username)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Continue' }).click()

    // permanent TOS as of Summer 2025
    const agreeToTerms = page.getByText('I agree to the BC Login')
    if (agreeToTerms) {
      await agreeToTerms.click()
      await page.getByRole('button', { name: 'Continue' }).click()
    }
  } else if (loginMethod === LoginSource.BCEID) {
    await page.getByRole('button', { name: 'Continue with BCeID' }).click()
    await page.locator('#user').fill(username)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Continue' }).click()
    if (environment.toLowerCase() !== 'development') {
      const accountActivity = page.getByText('To complete login with your')
      if (accountActivity) {
        await page.getByRole('button', { name: 'Continue' }).click()
      }
      const otp = generateOTP(otpSecret)
      await page.getByLabel('One-time code').click()
      await page.getByLabel('One-time code').fill(otp)
      await page.getByRole('button', { name: 'Sign In' }).click()
    }
  }

  await page.waitForURL(baseUrl + '**')
  await page.context().storageState({ path: `tests/e2e/.auth/${storagePath}.json` })
  await browser.close()
}
