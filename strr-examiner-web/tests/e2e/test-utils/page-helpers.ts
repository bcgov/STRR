import { type Page } from '@playwright/test'
import { config as dotenvConfig } from 'dotenv'

import { LoginSource } from '../enums/login-source'

// load default env
dotenvConfig()

export async function completeLogin (page: Page, loginMethod: LoginSource) {
  const baseUrl = process.env.NUXT_BASE_URL!
  const username = loginMethod === LoginSource.BCSC
    ? process.env.PLAYWRIGHT_TEST_BCSC_USERNAME!
    : process.env.PLAYWRIGHT_TEST_BCEID_USERNAME!
  const password = loginMethod === LoginSource.BCSC
    ? process.env.PLAYWRIGHT_TEST_BCSC_PASSWORD!
    : process.env.PLAYWRIGHT_TEST_BCEID_PASSWORD!

  await page.goto('en-CA/auth/login', { waitUntil: 'networkidle', timeout: 60000 })

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
}
