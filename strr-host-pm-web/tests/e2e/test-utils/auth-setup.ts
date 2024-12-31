import { type Browser, chromium, type Page } from '@playwright/test'
import dotenv from 'dotenv'
// load default env
dotenv.config()

// checks if site is available before running setup
async function isServerReady (url: string, timeout: number = 30000): Promise<boolean> {
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) { // loop until timeout is reached
    try {
      const response = await fetch(url) // try to ping site
      // return true if site is ready
      if (response.ok) {
        return true
      }
    } catch {
      // not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000)) // wait 1sec between fetches
  }
  return false // return false if reached timeout and no site is loaded
}

// handle auth setup
async function authSetup () {
  const baseURL = process.env.NUXT_BASE_URL!

  console.info('Waiting for the server to be ready...')
  // make sure app is available
  const serverReady = await isServerReady(baseURL)
  if (!serverReady) {
    throw new Error(`Server at ${baseURL} did not become ready within the timeout period.`)
  }

  // launch browser and create page context
  const browser: Browser = await chromium.launch()
  const context = await browser.newContext()
  const page: Page = await context.newPage()

  // perform login steps
  const username = process.env.PLAYWRIGHT_TEST_USERNAME!
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD!

  // ensure user and pw exist
  if (!username || !password) {
    throw new Error('User or password is not set in environment variables.')
  }

  await page.goto(baseURL + 'en-CA/auth/login')
  await page.getByRole('button', { name: 'Continue with BC Services Card' }).click()
  await page.getByLabel('Log in with Test with').click()
  await page.getByLabel('Email or username').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForURL(baseURL + '**')

  // write user data to file for re-use
  await page.context().storageState({ path: 'tests/e2e/.auth/user.json' })
  await browser.close() // cleanup browser
}

export default authSetup
