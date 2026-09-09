import { expect } from '@playwright/test'
import { observeApplication, paySandboxCard, verifyPaidApplication } from './platform-checkout.mjs'

export async function createStrataPayment(page, result, card) {
  result.testFixture = 'Nuxt4 Strata Payment QA ' + process.env.GITHUB_RUN_ID
  result.stage = 'strata-contact-form'
  await page.getByTestId('completing-party-radio-group').getByRole('radio', { name: 'Yes', exact: true }).check()
  await page.getByTestId('platform-primary-rep-position').fill('TEST representative')
  await page.getByTestId('phone-countryCode').fill('1')
  await page.getByRole('option').first().click()
  await page.getByTestId('phone-number').fill('2505550100')
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
  const [response] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).hostname ===
      'strr-api-test-166050292631.northamerica-northeast1.run.app' &&
      new URL(response.url()).pathname === '/applications' && response.request().method() === 'POST', { timeout: 60000 }),
    page.getByRole('button', { name: 'Submit & Pay', exact: true }).click()
  ])
  result.submissionStatus = response.status()
  if (!response.ok()) throw new Error('TEST Strata submission returned HTTP ' + response.status())
  const application = await response.json()
  result.applicationNumber = application.header.applicationNumber
  result.invoiceId = application.header.paymentToken
  result.initialStatus = application.header.status
  expect(result.initialStatus).toBe('PAYMENT_DUE')
  const pending = observeApplication(page, result)
  await paySandboxCard(page, result, card)
  const dashboard = 'https://test.stratahotel.shorttermrental.registry.gov.bc.ca/en-CA/strata-hotel/dashboard/' + result.applicationNumber
  await verifyPaidApplication(page, result, dashboard, pending)
}
