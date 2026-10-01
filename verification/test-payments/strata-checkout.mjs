import { expect } from '@playwright/test'
import { observeApplication, paySandboxCard, verifyPaidApplication } from './platform-checkout.mjs'

// Resume only the fresh fixture created by run 36913499984. Assert it is unpaid
// before entering the sandbox card; this is not a reusable creation entrypoint.
export async function createStrataPayment(page, result, card) {
  result.testFixture = 'pnpm11 Strata Payment QA 36913499984'
  result.applicationNumber = '28120908096053'
  result.invoiceId = 772890
  result.createdInRun = '36913499984'
  result.stage = 'strata-inspect-existing-invoice'
  const dashboard = 'https://test.stratahotel.shorttermrental.registry.gov.bc.ca/en-CA/strata-hotel/dashboard/' + result.applicationNumber
  const pending = observeApplication(page, result)
  const applicationPromise = page.waitForResponse(response => new URL(response.url()).hostname ===
    'strr-api-test-166050292631.northamerica-northeast1.run.app' &&
    new URL(response.url()).pathname === '/applications/' + result.applicationNumber &&
    response.request().method() === 'GET').then(async response => {
    expect(response.status()).toBe(200)
    return response.json()
  })
  await page.goto(dashboard, { waitUntil: 'domcontentloaded' })
  const application = await applicationPromise
  result.inspectedApplication = { status: application.header.status, paymentStatus: application.header.paymentStatus,
    invoiceId: application.header.paymentToken }
  expect(Number(result.inspectedApplication.invoiceId)).toBe(result.invoiceId)
  expect(result.inspectedApplication.paymentStatus).toBe('CREATED')
  expect(result.inspectedApplication.status).toBe('PAYMENT_DUE')
  await expect(page.getByTestId('h1')).toContainText(result.testFixture)
  result.stage = 'strata-resume-existing-invoice'
  await page.getByRole('button', { name: 'Pay Now', exact: true }).click()
  await paySandboxCard(page, result, card)
  await verifyPaidApplication(page, result, dashboard, pending)
}
