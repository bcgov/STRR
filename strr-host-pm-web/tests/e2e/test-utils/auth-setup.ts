import { type Browser, chromium, type Page } from '@playwright/test'
import { config as dotenvConfig } from 'dotenv'
import { existsSync, mkdirSync } from 'fs'
dotenvConfig()

export async function authSetup (
  storagePath: string
) {
  const browser: Browser = await chromium.launch()
  const context = await browser.newContext()
  const page: Page = await context.newPage()

  const baseUrl = process.env.NUXT_BASE_URL!
  const username = process.env.PLAYWRIGHT_TEST_BCSC_USERNAME!
  const password = process.env.PLAYWRIGHT_TEST_BCSC_PASSWORD!

  console.info(`[AuthSetup] Navigating to login page: ${baseUrl}`)
  await page.goto(baseUrl + 'en-CA/auth/login', { waitUntil: 'load', timeout: 360000 })

  await page.getByRole('button', { name: 'Continue with BC Services Card' }).click()
  await page.getByLabel('Log in with Test with').click()
  await page.getByLabel('Email or username').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL(baseUrl + '**')

  // Ensure the `.auth` folder exists before saving storage state
  const authDir = 'tests/e2e/.auth'
  if (!existsSync(authDir)) {
    console.info(`[AuthSetup] Creating .auth directory at ${authDir}`)
    mkdirSync(authDir, { recursive: true })
  }

  console.info(`[AuthSetup] Saving storage state to ${authDir}/${storagePath}.json`)
  await page.context().storageState({ path: `${authDir}/${storagePath}.json` })

  await browser.close()
  console.info(`[AuthSetup] Auth flow completed and storage saved.`)
}
