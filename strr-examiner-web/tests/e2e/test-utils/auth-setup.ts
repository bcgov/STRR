import { type Browser, chromium, type Page } from '@playwright/test'
import { config as dotenvConfig } from 'dotenv'
import { LoginSource } from '../enums/login-source'
// import { generateOTP } from './generate-otp'
// load default env
dotenvConfig()

export async function authSetup (
  loginMethod: LoginSource,
  storagePath: string
) {
  // launch browser and create page context
  const browser: Browser = await chromium.launch()
  const context = await browser.newContext()
  const page: Page = await context.newPage()

  const baseUrl = process.env.NUXT_BASE_URL!
  const username = process.env.PLAYWRIGHT_TEST_USERNAME!
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD!
  // const environment = process.env.NUXT_ENVIRONMENT_HEADER!.toLowerCase()
  // const otpSecret = process.env.PLAYWRIGHT_TEST_BCEID_OTP_SECRET!

  await page.goto(baseUrl + 'en-CA/auth/login', { waitUntil: 'networkidle', timeout: 60000 })

  if (loginMethod === LoginSource.IDIR) {
    await page.getByRole('button', { name: 'Continue with IDIR' }).click()
    await page.locator('#user').fill(username)
    await page.getByRole('textbox', { name: 'Password' }).fill(password)
    await page.getByRole('button', { name: 'Continue' }).click()
  }

  await page.waitForURL(baseUrl + '**')
  await page.context().storageState({ path: `tests/e2e/.auth/${storagePath}.json` })
  await browser.close()
}
