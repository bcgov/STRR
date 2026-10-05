import { expect } from '@playwright/test'
import { observeApplication, paySandboxCard, verifyPaidApplication, checkpoint } from './platform-checkout.mjs'

// Recover only the Host fixture created by run 37346201028. Never create another.
export async function resumeHostPayment(page, result, card, apiHeaders) {
  result.testFixture = 'pnpm11 DEV Host QA 37346201028'
  result.applicationNumber = '04320199152354'
  result.invoiceId = 70909
  result.createdInRun = '37346201028'
  result.stage = 'host-inspect-existing-invoice'
  if (!/^Bearer\s+\S+$/.test(apiHeaders?.authorization || '') || !apiHeaders?.['account-id']) {
    throw new Error('Authenticated selected-account API headers unavailable')
  }
  const apiUrl = 'https://strr-api-dev-i2rbretwta-nn.a.run.app/applications/' + result.applicationNumber
  const dashboard = 'https://dev.host.shorttermrental.registry.gov.bc.ca/en-CA/dashboard/application/' + result.applicationNumber
  const inspectExisting = async () => {
    const response = await page.request.get(apiUrl, { headers: apiHeaders, timeout: 30000 })
    expect(response.status()).toBe(200)
    const application = await response.json()
    expect(application.header.applicationNumber).toBe(result.applicationNumber)
    expect(Number(application.header.paymentToken)).toBe(result.invoiceId)
    expect(application.registration.unitAddress.nickname).toBe(result.testFixture)
    return { status: application.header.status, paymentStatus: application.header.paymentStatus,
      invoiceId: application.header.paymentToken, fixtureMatches: true }
  }
  result.inspectedApplication = await inspectExisting()
  result.initialStatus = result.inspectedApplication.status
  const alreadyCompleted = result.inspectedApplication.paymentStatus === 'COMPLETED'
  if (!alreadyCompleted) {
    expect(result.inspectedApplication.status).toBe('PAYMENT_DUE')
    expect(result.inspectedApplication.paymentStatus).toBe('CREATED')
  }
  await checkpoint(result)
  const pending = observeApplication(page, result)
  await page.goto(dashboard, { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('h1')).toContainText(result.testFixture)
  if (alreadyCompleted) {
    result.previouslyCompleted = true
    await verifyPaidApplication(page, result, dashboard, pending)
    return
  }
  result.resumedExistingUnpaidInvoice = true
  await page.getByRole('button', { name: 'Pay Now', exact: true }).click()

  // Cancel at the observed test merchant before entering card fields.
  result.stage = 'host-cancel-checkout'
  await page.waitForURL(url => url.hostname === 'paytestp.gov.bc.ca', { timeout: 60000 })
  await page.getByRole('button', { name: 'Proceed To Pay', exact: true }).click()
  await page.waitForURL(url => url.hostname === 'web.na.bambora.com', { timeout: 60000 })
  await expect(page.getByText('Account paybc_testp is in test mode', { exact: true })).toBeVisible()
  await page.locator('#cancelButton').click()
  await page.waitForURL(url => url.hostname === 'dev.account.bcregistry.gov.bc.ca' &&
    url.pathname.startsWith('/returnpayment/' + result.invoiceId + '/'), { timeout: 60000 })
  await expect(page.getByText('Payment Cancelled', { exact: true })).toBeVisible()
  result.cancellationConfirmedByPortal = true
  await page.getByText('Ok', { exact: true }).click()
  await page.waitForURL(url => url.origin + url.pathname === dashboard, { timeout: 60000 })
  await expect(page.getByTestId('h1')).toContainText(result.testFixture, { timeout: 30000 })
  await expect(page.getByRole('button', { name: 'Pay Now', exact: true })).toBeVisible()
  result.cancelledApplication = await inspectExisting()
  expect(result.cancelledApplication.status).toBe('PAYMENT_DUE')
  expect(result.cancelledApplication.paymentStatus).toBe('CREATED')
  result.cancelReturnedUnpaid = true
  result.cancelReturnUrl = dashboard
  await checkpoint(result)
  result.stage = 'host-resume-checkout'
  await page.getByRole('button', { name: 'Pay Now', exact: true }).click()
  await paySandboxCard(page, result, card)
  await verifyPaidApplication(page, result, dashboard, pending)
}
