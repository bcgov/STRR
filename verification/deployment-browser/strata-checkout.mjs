import { expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { fillStrataForm } from './strata-fee-guard.mjs'
import { loadTestCard, observeApplication, paySandboxCard, verifyPaidApplication } from './payment-helpers.mjs'

// One fresh synthetic application only. Never reuse a previous run's invoice.
export async function verifyStrataCheckout(page, result, environment, accountId) {
  if (environment !== 'test') throw new Error('Sandbox checkout is TEST only')
  const card = loadTestCard([])
  const origin = 'https://test.stratahotel.shorttermrental.registry.gov.bc.ca'
  const apiHost = 'strr-api-test-166050292631.northamerica-northeast1.run.app'
  const feePattern = '**/api/v1/fees/STRR/STRATAREG*'
  const checkout = result.checkout = { writeAttempts: [], failedFeeRequests: 0 }
  const checkpoint = () => writeFile('results/strata-checkout-checkpoint.json', JSON.stringify({
    runId: process.env.GITHUB_RUN_ID, harnessCommit: process.env.GITHUB_SHA,
    testFixture: result.testFixture, stage: result.stage,
    applicationNumber: result.applicationNumber, invoiceId: result.invoiceId,
    draftApplicationNumber: result.draftApplicationNumber, checkout
  }, null, 2) + '\n')
  let draftAttempted = false
  let submissionAttempted = false
  await page.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.hostname !== apiHost || ['GET', 'OPTIONS'].includes(request.method())) return route.fallback()
    if (result.applicationNumber && request.method() === 'PUT' &&
        url.pathname === `/applications/${result.applicationNumber}/payment-details`) return route.continue()
    if (!['strata-save-draft', 'strata-submit-checkout'].includes(result.stage)) return route.fallback()
    const draft = result.stage === 'strata-save-draft'
    const expectedPath = !draft && result.draftApplicationNumber ? `/applications/${result.draftApplicationNumber}` : '/applications'
    const expectedMethod = expectedPath === '/applications' ? 'POST' : 'PUT'
    if (url.pathname !== expectedPath || request.method() !== expectedMethod) return route.fallback()
    if (draft ? draftAttempted : submissionAttempted) return route.fallback()
    const headers = await request.allHeaders()
    const body = request.postDataJSON()
    expect(headers['account-id']).toBe(accountId)
    expect(headers.isdraft === 'true').toBe(draft)
    expect(body.registration.registrationType).toBe('STRATA_HOTEL')
    expect(body.registration.businessDetails.legalName).toBe(result.testFixture)
    expect(body.header.paymentMethod).toBe('DIRECT_PAY')
    expect(body.header.applicationType).toBeUndefined()
    expect(body.header.registrationId).toBeUndefined()
    if (draft) draftAttempted = true
    else submissionAttempted = true
    const attempt = { kind: draft ? 'draft' : 'submission', startedAt: new Date().toISOString() }
    checkout.writeAttempts.push(attempt)
    await checkpoint()
    // Capture identity before delivering the response to the page/redirect.
    // No retry: an uncertain write must be inspected, never repeated blindly.
    const response = await route.fetch({ maxRetries: 0, maxRedirects: 0, timeout: 60000 })
    attempt.status = response.status()
    expect(response.ok()).toBe(true)
    const application = await response.json()
    result.applicationNumber = application.header.applicationNumber
    result.invoiceId = application.header.paymentToken
    attempt.applicationStatus = application.header.status
    if (draft) result.draftApplicationNumber = result.applicationNumber
    await checkpoint()
    expect(application.registration.businessDetails.legalName).toBe(result.testFixture)
    expect(/^\d+$/.test(String(result.applicationNumber))).toBe(true)
    if (draft) {
      expect(application.header.status).toBe('DRAFT')
      expect(result.invoiceId == null).toBe(true)
      checkout.savedWithoutInvoice = true
    } else {
      expect(application.header.status).toBe('PAYMENT_DUE')
      expect(Number(result.invoiceId)).toBeGreaterThan(0)
      if (result.draftApplicationNumber) expect(result.applicationNumber).toBe(result.draftApplicationNumber)
      checkout.submissionCaptured = true
    }
    await checkpoint()
    await route.fulfill({ response })
  })
  const failFee = async route => {
    expect(new URL(route.request().url()).hostname.startsWith('pay-api-test-')).toBe(true)
    checkout.failedFeeRequests++
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Synthetic QA fee outage"}' })
  }
  await page.route(feePattern, failFee)
  page.on('dialog', dialog => dialog.type() === 'beforeunload' ? dialog.accept() : dialog.dismiss())
  await page.goto(origin + '/en-CA/strata-hotel/application', { waitUntil: 'domcontentloaded' })
  await fillStrataForm(page, result)
  result.stage = 'strata-checkout-missing-fee'
  await page.getByRole('button', { name: 'Submit & Pay', exact: true }).click()
  await expect(page.getByText('Unable to load registration fee', { exact: true })).toBeVisible()
  expect(checkout.failedFeeRequests).toBeGreaterThan(0)
  expect(result.blockedWrites).toBe(0)
  expect(checkout.writeAttempts).toHaveLength(0)
  await page.getByRole('button', { name: 'Close', exact: true }).filter({ hasText: /^Close$/ }).click()
  const save = page.getByRole('button', { name: 'Save', exact: true })
  checkout.saveDraftAvailable = await save.count() === 1 && await save.isVisible()
  if (checkout.saveDraftAvailable) {
    result.stage = 'strata-save-draft'
    await save.click()
    await expect.poll(() => checkout.savedWithoutInvoice, { timeout: 60000 }).toBe(true)
    await expect(save).toBeEnabled()
  }
  result.stage = 'strata-checkout-fee-recovery'
  const feeCount = result.fees.length
  await page.unroute(feePattern, failFee)
  if (result.draftApplicationNumber) {
    await page.goto(origin + '/en-CA/strata-hotel/application?applicationId=' + result.draftApplicationNumber, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(page.getByTestId('strata-business-legal-name')).toHaveValue(result.testFixture)
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(page.getByTestId('strata-brand-name')).toHaveValue(result.testFixture)
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await page.getByTestId('confirmation-checkbox').check()
    checkout.draftResumed = true
  } else {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await fillStrataForm(page, result)
  }
  await expect.poll(() => result.fees.slice(feeCount).some(fee => fee.code === 'STRATAREG' && fee.status === 200 && fee.total > 0)).toBe(true)
  const expectedAmount = result.fees.slice(feeCount).find(fee => fee.code === 'STRATAREG' && fee.status === 200).total
  const pending = observeApplication(page, result)
  result.stage = 'strata-submit-checkout'
  await page.getByRole('button', { name: 'Submit & Pay', exact: true }).click()
  await expect.poll(() => checkout.submissionCaptured, { timeout: 60000 }).toBe(true)
  await paySandboxCard(page, result, card, expectedAmount)
  await verifyPaidApplication(page, result, origin + '/en-CA/strata-hotel/dashboard/' + result.applicationNumber, pending)
  checkout.result = 'passed'
  await checkpoint()
}
