import { expect } from '@playwright/test'
import { observeApplication, paySandboxCard, verifyPaidApplication, checkpoint } from './platform-checkout.mjs'

export async function createStrataPayment(page, result, card) {
  result.testFixture = 'pnpm11 DEV Strata QA ' + process.env.GITHUB_RUN_ID
  result.stage = 'strata-contact-form'
  await page.getByTestId('completing-party-radio-group').getByRole('radio', { name: 'Yes', exact: true }).check()
  await page.getByTestId('platform-primary-rep-position').fill('TEST representative')
  await page.getByTestId('phone-countryCode').fill('1')
  await page.getByRole('option', { name: /\+1\s*Canada/ }).click()
  await page.getByTestId('phone-number').fill('')
  await page.getByTestId('phone-number').pressSequentially('2505550100', { delay: 80 })
  await page.getByTestId('phone-number').press('Tab')
  await expect(page.getByTestId('phone-number')).toHaveValue('(250) 555-0100')
  await page.getByTestId('platform-primary-rep-party-email').fill('strr-payment-qa@example.com')
  await page.getByRole('button', { name: 'Next', exact: true }).click()

  result.stage = 'strata-business-form'
  await page.getByTestId('strata-business-legal-name').fill(result.testFixture)
  await page.getByTestId('strata-business-home-jur').fill('British Columbia')
  await page.getByTestId('strata-business-address-country').click()
  await page.getByRole('option', { name: 'Canada', exact: true }).click()
  await page.getByTestId('strata-business-address-street').fill('123 Test Street')
  await page.getByTestId('mailingAddress.city').fill('Victoria')
  await page.getByTestId('address-region-select').click()
  await page.getByRole('option', { name: 'British Columbia', exact: true }).click()
  await page.getByTestId('mailingAddress.postalCode').fill('V8W 9P6')
  await page.getByRole('button', { name: 'Next', exact: true }).click()

  result.stage = 'strata-details-form'
  await page.getByTestId('strata-brand-name').fill(result.testFixture)
  await page.getByTestId('strata-brand-site').fill('https://example.com/strr-payment-qa')
  await page.locator('input[type="radio"][value="MULTI_UNIT_NON_PR"]').check()
  await page.getByTestId('strata-details-numberOfUnits').fill('1')
  await page.getByTestId('strata-primary-address-street').fill('123 Test Street')
  await page.getByTestId('location.city').fill('Victoria')
  await page.getByTestId('location.postalCode').fill('V8W 9P6')
  await page.locator('#unitListings-primary-unit-list').fill('101')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByTestId('confirmation-checkbox').check()

  result.stage = 'strata-submit'
  const [submission] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).hostname ===
      'strr-api-dev-i2rbretwta-nn.a.run.app' &&
      new URL(response.url()).pathname === '/applications' && response.request().method() === 'POST', { timeout: 60000 }).then(async response => {
      result.submissionStatus = response.status()
      if (!response.ok()) throw new Error('DEV application submission did not succeed')
      // Read immediately, before the click finishes navigation to the gateway.
      const { header } = await response.json()
      result.applicationNumber = header.applicationNumber
      result.invoiceId = header.paymentToken
      result.initialStatus = header.status
      await checkpoint(result)
      return { status: response.status(), body: { applicationNumber: header.applicationNumber,
        invoiceId: header.paymentToken, applicationStatus: header.status } }
    }),
    page.getByRole('button', { name: 'Submit & Pay', exact: true }).click()
  ])
  expect(submission.body.applicationStatus).toBe('PAYMENT_DUE')
  expect(Number(submission.body.invoiceId)).toBeGreaterThan(0)
  const pending = observeApplication(page, result)
  await paySandboxCard(page, result, card)
  const dashboard = 'https://dev.stratahotel.shorttermrental.registry.gov.bc.ca/en-CA/strata-hotel/dashboard/' + result.applicationNumber
  await verifyPaidApplication(page, result, dashboard, pending)
}
