// import { type Browser, chromium, type Page } from '@playwright/test'
import { config as dotenvConfig } from 'dotenv'
import { LoginSource } from '../enums/login-source'
import { authSetup } from './auth-setup'
// load default env
dotenvConfig()

// runs once before all tests: performs login and saves the browser session to tests/e2e/.auth/
// server should be running because of playwright's webServer config
async function globalSetup () {
  await Promise.all([
    authSetup(
      LoginSource.IDIR,
      'idir-user'
    )
  ])
}

export default globalSetup
