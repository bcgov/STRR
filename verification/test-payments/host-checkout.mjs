import { expect } from '@playwright/test'
import { observeApplication, paySandboxCard, verifyPaidApplication } from './platform-checkout.mjs'

// Resume the unpaid Host application created in run 34417032570.
export async function createHostPayment(page, result, card) {
  result.testFixture = 'Nuxt4 Host Payment QA 34417032570'
  result.applicationNumber = '80420445398210'
  result.invoiceId = 771478
  result.fixtureCreatedInRun = '34417032570'
  const pending = observeApplication(page, result)
  result.stage = 'open-unpaid-host-application'
  await page.goto('https://test.host.shorttermrental.registry.gov.bc.ca/en-CA/dashboard-new')
  const row = page.getByRole('row').filter({ hasText: result.applicationNumber })
  await row.getByRole('link', { name: 'View', exact: true }).click()
  await expect(page.getByTestId('h1')).toContainText(result.testFixture, { timeout: 30000 })
  await page.getByRole('button', { name: 'Pay Now', exact: true }).click()

  result.stage = 'host-cancel-checkout'
  await page.waitForURL(url => url.hostname === 'paytestp.gov.bc.ca', { timeout: 60000 })
  await page.getByRole('button', { name: 'Proceed To Pay', exact: true }).click()
  await page.waitForURL(url => url.hostname === 'web.na.bambora.com', { timeout: 60000 })
  await expect(page.getByText('Account paybc_testp is in test mode', { exact: true })).toBeVisible()
  await page.locator('#cancelButton').click()
  await page.waitForURL(url => url.hostname === 'test.account.bcregistry.gov.bc.ca' &&
    url.pathname.startsWith('/returnpayment/' + result.invoiceId + '/'), { timeout: 60000 })
  await expect(page.getByText('Payment Cancelled', { exact: true })).toBeVisible()
  result.cancellationConfirmedByPortal = true
  await page.getByText('Ok', { exact: true }).click()
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
