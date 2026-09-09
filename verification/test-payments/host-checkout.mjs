import { expect } from '@playwright/test'
import { observeApplication, paySandboxCard, verifyPaidApplication } from './platform-checkout.mjs'

export async function createHostPayment(page, result, card) {
  result.testFixture = 'Nuxt4 Host Payment QA ' + process.env.GITHUB_RUN_ID
  result.stage = 'host-property-form'
  await page.getByTestId('rental-unit-address-nickname').fill(result.testFixture)
  await page.getByRole('button', { name: 'Enter the residential address manually', exact: true }).click()
  // Existing repository Scenario 6: non-exempt Chetwynd fixture with no BL/PR documents required.
  await page.getByTestId('rental-property-address-streetNumber').fill('5300')
  await page.getByTestId('rental-property-address-streetName').fill('44A Ave NW')
  await page.getByTestId('address.city').fill('Chetwynd')
  await page.getByTestId('address.postalCode').fill('V0C 1J0')
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(page.getByTestId('alert-pr-exempt')).toBeVisible({ timeout: 30000 })
  await page.getByTestId('property-type-select').click()
  await page.getByRole('option', { name: 'Single Family Home', exact: true }).click()
  await page.locator('#host-type-radio-group input[value="OWNER"]').check()
  await page.locator('#rental-unit-setup-radio-group input[value="PRIMARY_RESIDENCE_OR_SHARED_SPACE"]').check()
  await page.getByRole('button', { name: 'Next', exact: true }).click()

  result.stage = 'host-individual-form'
  await page.getByRole('button', { name: 'Add an Individual', exact: true }).click()
  const owner = page.getByTestId('host-owner')
  await owner.getByTestId('completing-party-checkbox').check()
  await owner.locator('input[type="radio"][value="HOST"]').check()
  await owner.getByTestId('date-select').fill('1986-10-23')
  await owner.getByRole('checkbox', { name: 'This individual does not have a CRA Tax Number', exact: true }).check()
  await owner.getByTestId('host-owner-address-country').click()
  await page.getByRole('option', { name: 'Canada', exact: true }).click()
  await owner.getByTestId('host-owner-address-street').fill('123 Test Street')
  await owner.getByTestId('mailingAddress.city').fill('Victoria')
  await owner.getByTestId('address-region-select').click()
  await page.getByRole('option', { name: 'British Columbia', exact: true }).click()
  await owner.getByTestId('mailingAddress.postalCode').fill('V8W 9P6')
  await owner.getByTestId('phone-countryCode').fill('1')
  await page.getByRole('option', { name: /\+1\s*Canada/ }).click()
  await owner.getByTestId('phone-number').pressSequentially('2505550100', { delay: 80 })
  await owner.getByTestId('phone-number').press('Tab')
  await expect(owner.getByTestId('phone-number')).toHaveValue('(250) 555-0100')
  await owner.getByTestId('host-owner-email').fill('strr-payment-qa@example.com')
  await owner.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(owner).not.toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()

  result.stage = 'host-supporting-information'
  await expect(page.getByTestId('alert-no-docs-required')).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByTestId('agreedToRentalAct-checkbox').check()
  await page.getByTestId('agreedToSubmit-checkbox').check()
  result.stage = 'host-submit'
  await page.getByRole('button', { name: 'Proceed to Payment', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Leave application and proceed to payment?', exact: true })).toBeVisible()
  const [response] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).hostname ===
      'strr-api-test-166050292631.northamerica-northeast1.run.app' &&
      new URL(response.url()).pathname === '/applications' && response.request().method() === 'POST', { timeout: 60000 }),
    page.getByRole('button', { name: 'Proceed to payment', exact: true }).click()
  ])
  result.submissionStatus = response.status()
  if (!response.ok()) throw new Error('TEST Host submission returned HTTP ' + response.status())
  const application = await response.json()
  result.applicationNumber = application.header.applicationNumber
  result.invoiceId = application.header.paymentToken
  result.initialStatus = application.header.status
  expect(result.initialStatus).toBe('PAYMENT_DUE')
  const pending = observeApplication(page, result)

  // Cancel at the observed test merchant before entering card fields.
  result.stage = 'host-cancel-checkout'
  await page.waitForURL(url => url.hostname === 'paytestp.gov.bc.ca', { timeout: 60000 })
  await page.getByRole('button', { name: 'Proceed To Pay', exact: true }).click()
  await page.waitForURL(url => url.hostname === 'web.na.bambora.com', { timeout: 60000 })
  await expect(page.getByText('Account paybc_testp is in test mode', { exact: true })).toBeVisible()
  await page.locator('#cancelButton').click()
  await page.waitForURL(url => url.origin === 'https://test.host.shorttermrental.registry.gov.bc.ca', { timeout: 60000 })
  await expect(page.getByTestId('h1')).toContainText(result.testFixture, { timeout: 30000 })
  await expect(page.getByRole('button', { name: 'Pay Now', exact: true })).toBeVisible()
  await Promise.all(pending)
  expect(result.applicationResponses.some(r => r.applicationStatus === 'PAYMENT_DUE')).toBe(true)
  result.cancelReturnedUnpaid = true
  result.cancelReturnUrl = new URL(page.url()).origin + new URL(page.url()).pathname
  result.stage = 'host-resume-checkout'
  await page.getByRole('button', { name: 'Pay Now', exact: true }).click()
  await paySandboxCard(page, result, card)
  await verifyPaidApplication(page, result, result.cancelReturnUrl, pending)
}
