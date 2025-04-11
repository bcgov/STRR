// import { type Browser, chromium, type Page } from '@playwright/test'
import { config as dotenvConfig } from 'dotenv'
// load default env
dotenvConfig()

// checks if site is available before running setup
async function isServerReady (url: string, timeout: number = 360000): Promise<boolean> {
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) { // loop until timeout is reached
    try {
      const response = await fetch(url) // try to ping site
      // return true if site is ready
      if (response.ok) {
        return true
      }
    } catch (err) {
      // not ready yet
      console.warn(`[isServerReady] Ping failed: ${err}`)
    }
    await new Promise(resolve => setTimeout(resolve, 2000)) // wait 1sec between fetches
  }
  return false // return false if reached timeout and no site is loaded
}

async function globalSetup () {
  const baseUrl = process.env.NUXT_BASE_URL!
  console.info(`[Setup] Base URL: ${baseUrl}`)

  console.info('Waiting for the server to be ready...')
  // make sure app is available
  const start = Date.now()
  const serverReady = await isServerReady(baseUrl)
  const duration = ((Date.now() - start) / 1000).toFixed(2)
  if (!serverReady) {
    console.error(`[Setup] Server was not ready after ${duration}s`)
    throw new Error(`Server at ${baseUrl} did not become ready within the timeout period.`)
  }
  console.info(`[Setup] Server is ready after ${duration}s`)
  console.info('[Setup] Starting authSetup for BCSC user...')

  try {
    await authSetup(LoginSource.BCSC, 'bcsc-user')
    console.info('[Setup] BCSC auth completed successfully.')
  } catch (err) {
    console.error('[Setup] BCSC auth failed:', err)
    throw err
  }

  // await Promise.all([
  //   authSetup(
  //     LoginSource.BCSC,
  //     'bcsc-user'
  //   )
  //   , authSetup(
  //     LoginSource.BCEID,
  //     'bceid-user'
  //   )
  // ])
}

export default globalSetup
