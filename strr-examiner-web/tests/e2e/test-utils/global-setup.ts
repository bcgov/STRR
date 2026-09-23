import { authSetup } from './auth-setup'
import { getPlaywrightE2eAuthStorageKey, getPlaywrightE2eLoginSource } from './constants'
import { loadPlaywrightEnv } from './load-playwright-env'

// runs once before all tests: performs login and saves the browser session to tests/e2e/.auth/
// server should be running because of playwright's webServer config
async function globalSetup () {
  loadPlaywrightEnv()
  await authSetup(getPlaywrightE2eLoginSource(), getPlaywrightE2eAuthStorageKey())
}

export default globalSetup
