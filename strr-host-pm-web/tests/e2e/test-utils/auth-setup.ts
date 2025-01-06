import { type Browser, chromium, type Page } from '@playwright/test'
import { LoginSource } from '../enums/login-source'

export async function authSetup (
  baseUrl: string,
  loginMethod: LoginSource,
  username: string,
  password: string,
  storagePath: string
) {
  // launch browser and create page context
  const browser: Browser = await chromium.launch()
  const context = await browser.newContext()
  const page: Page = await context.newPage()

  await page.goto(baseUrl + 'en-CA/auth/login')

  if (loginMethod === LoginSource.BCSC) {
    await page.getByRole('button', { name: 'Continue with BC Services Card' }).click()
    await page.getByLabel('Log in with Test with').click()
    await page.getByLabel('Email or username').fill(username)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Continue' }).click()
  } else if (loginMethod === LoginSource.BCEID) {
    await page.getByRole('button', { name: 'Continue with BCeID' }).click()
    await page.locator('#user').fill(username)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Continue' }).click()
  }

  await page.waitForURL(baseUrl + '**')
  await page.context().storageState({ path: `tests/e2e/.auth/${storagePath}.json` })
  await browser.close()
}
