import { type Page } from '@playwright/test'
import { authenticator } from 'otplib'

authenticator.options = { window: 1 }

function generateOTP (secret: string): string {
  return authenticator.generate(secret)
}

/**
 * After username/password on the Keycloak / BCeID broker, submit TOTP when the MFA step appears.
 * Tries several locators (incl. legacy gov.bc.ca CLP) and child frames.
 */
export async function fillBceidTotpAndContinue (page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})

  // // click #mode-manual to reveal the secret
  // const modeManual = page.locator('#mode-manual').first()
  // await modeManual.click({ timeout: 15_000 })

  // // get the secret from #kc-totp-secret-key
  // const secretElement = page.locator('#kc-totp-secret-key').first()
  // const secret = await secretElement.textContent()
  // console.log('secret', secret)
  // if (!secret) {
  //   throw new Error('Secret not found')
  // }

  // const secretNoSpaces = secret.replace(/ /g, '')

  // console.log('secret', secretNoSpaces)
  const otp = generateOTP(process.env.PLAYWRIGHT_TEST_BCEID_OTP_SECRET ?? '')
  const field = page.locator('#otp').first()
  await field.fill(otp)
  const loginButton = page.locator('#kc-login').first()
  await loginButton.click({ timeout: 15_000 })
}
