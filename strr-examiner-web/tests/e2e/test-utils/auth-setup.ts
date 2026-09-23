import { type Browser, chromium, type Page } from '@playwright/test'
import { LoginSource } from '../enums/login-source'
import { fillBceidTotpAndContinue } from './generate-otp'
import { loadPlaywrightEnv } from './load-playwright-env'

export async function authSetup (
  loginMethod: LoginSource,
  storagePath: string
) {
  loadPlaywrightEnv()
  const browser: Browser = await chromium.launch()
  const context = await browser.newContext({
    recordVideo: {
      dir: 'test-results/auth-setup',
      size: { width: 1280, height: 720 }
    }
  })
  const page: Page = await context.newPage()

  const baseUrl = process.env.NUXT_BASE_URL
  if (!baseUrl) {
    throw new Error('NUXT_BASE_URL is required for Playwright auth setup')
  }

  if (loginMethod === LoginSource.IDIR) {
    await page.goto(baseUrl + 'en-CA/auth/login', { waitUntil: 'networkidle', timeout: 60_000 })
    const username = process.env.PLAYWRIGHT_TEST_USERNAME
    const password = process.env.PLAYWRIGHT_TEST_PASSWORD
    if (!username?.trim() || !password) {
      throw new Error('PLAYWRIGHT_TEST_USERNAME and PLAYWRIGHT_TEST_PASSWORD are required for IDIR e2e')
    }
    await page.getByRole('button', { name: 'Continue with IDIR' }).click()
    await page.locator('#user').fill(username)
    await page.getByRole('textbox', { name: 'Password' }).fill(password)
    await page.getByRole('button', { name: 'Continue' }).click()
  } else if (loginMethod === LoginSource.BCEID) {
    const username = process.env.PLAYWRIGHT_TEST_BCEID_USERNAME
    const password = process.env.PLAYWRIGHT_TEST_BCEID_PASSWORD
    if (!username?.trim() || !password) {
      throw new Error('PLAYWRIGHT_TEST_BCEID_USERNAME and PLAYWRIGHT_TEST_BCEID_PASSWORD are required for BCeID e2e')
    }
    await page.goto(`${baseUrl}en-CA/auth/login?idp=bceid`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000
    })
    await page.waitForURL(
      url => !url.pathname.includes('/auth/login'),
      { timeout: 45_000 }
    )
    await page.locator('#user').fill(username)
    await page.locator('#password').fill(password)
    const continueButton = page.getByRole('button', { name: 'Continue' })
    await continueButton.click()
    await page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => {})

    if (process.env.PLAYWRIGHT_TEST_BCEID_TOTP_FLOW === 'true') {
      const pages = context.pages()
      const totpPage = pages.length > 1 ? pages[pages.length - 1]! : page
      await fillBceidTotpAndContinue(totpPage)
    }
  } else {
    throw new Error(`Unsupported login method: ${String(loginMethod)}`)
  }

  await page.waitForURL(baseUrl + '**')
  await page.context().storageState({ path: `tests/e2e/.auth/${storagePath}.json` })
  await browser.close()
}
