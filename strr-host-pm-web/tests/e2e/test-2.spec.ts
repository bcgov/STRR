import { test, expect } from '@playwright/test'
import * as OTPAuth from 'otpauth'

function generateOTP (secret?: string) {
  const totp = new OTPAuth.TOTP({
    secret: 'IZTWUNLHOBZEIUCGGFJWOT2SONTXAZBS',
    digits: 6,
    algorithm: 'sha1',
    period: 30
  })

  return totp.generate()
}

test.skip('test', async ({ page }) => {
  await page.goto('https://test.host.shorttermrental.registry.gov.bc.ca/en-CA/auth/login/')
  await page.getByRole('button', { name: 'Continue with BCeID' }).click()
  await page.locator('#user').fill('dwol-bceid-test4')
  await page.getByLabel('Password').click()
  await page.getByLabel('Password').fill('ryqtIq-hihbap-movxe4')
  await page.getByRole('button', { name: 'Continue' }).click()
  const accountActivity = page.getByText('To complete login with your')
  if (accountActivity) {
    await page.getByRole('button', { name: 'Continue' }).click()
  }
  const otp = generateOTP()
  console.log(otp)
  await page.getByLabel('One-time code').click()
  await page.getByLabel('One-time code').fill(otp)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.getByTestId('choose-existing-account-button').click()
})
