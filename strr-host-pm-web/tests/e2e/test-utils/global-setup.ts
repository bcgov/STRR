// import { type Browser, chromium, type Page } from '@playwright/test'
import { config as dotenvConfig } from 'dotenv'
import { LoginSource } from '../enums/login-source'
import { authSetup } from './auth-setup'
// load default env
dotenvConfig()

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

async function globalSetup () {
  const baseUrl = process.env.NUXT_BASE_URL!

  console.info('Waiting for the server to be ready...')
  // make sure app is available
  const serverReady = await isServerReady(baseUrl)
  if (!serverReady) {
    throw new Error(`Server at ${baseUrl} did not become ready within the timeout period.`)
  }

  await Promise.all([
    authSetup(
      baseUrl,
      LoginSource.BCSC,
      process.env.PLAYWRIGHT_TEST_BCSC_USERNAME!,
      process.env.PLAYWRIGHT_TEST_BCSC_PASSWORD!,
      'bcsc-user'
    ),
    authSetup(
      baseUrl,
      LoginSource.BCEID,
      process.env.PLAYWRIGHT_TEST_BCEID_USERNAME!,
      process.env.PLAYWRIGHT_TEST_BCEID_PASSWORD!,
      'bceid-user'
    )
  ])
}

export default globalSetup
