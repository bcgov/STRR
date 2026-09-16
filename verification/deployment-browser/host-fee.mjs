import { expect } from '@playwright/test'
import { fillHostForm, submitHostPayment } from './host-checkout.mjs'
import { loadTestCard } from './payment-helpers.mjs'

const origin = 'https://test.host.shorttermrental.registry.gov.bc.ca'
const apiHost = 'strr-api-test-166050292631.northamerica-northeast1.run.app'
const selectedFee = '**/api/v1/fees/STRR/HOSTREG_1*'
const isApplicationWrite = request => new URL(request.url()).hostname === apiHost &&
  /^\/applications(?:\/\d+)?$/.test(new URL(request.url()).pathname) &&
  ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())

export async function verifyHostFee(page, report) {
  if (process.env.VERIFY_ENVIRONMENT !== 'test') throw new Error('Synthetic checkout is TEST only')
  const card = loadTestCard([])
  const result = report.hostFee = {
    testFixture: 'Host Fee Guard QA ' + process.env.GITHUB_RUN_ID,
    blockedFeeRequests: 0, blockedSubmissionAttempts: 0, recoveryFeeStatuses: []
  }
  page.on('response', response => {
    const url = new URL(response.url())
    if (url.hostname.startsWith('pay-api-test-') && /^\/api\/v1\/accounts\/[^/]+\/?$/.test(url.pathname) && response.ok()) {
      response.json().then(body => { result.paymentMethod = body.paymentMethod }).catch(() => {})
    }
  })
  // A request guard makes the negative check safe even if checkout regresses.
  const preventApplicationWrite = async route => {
    if (isApplicationWrite(route.request())) {
      result.blockedSubmissionAttempts++
      await route.abort('blockedbyclient')
    } else await route.continue()
  }
  const failFee = async route => {
    if (!new URL(route.request().url()).hostname.startsWith('pay-api-test-')) {
      throw new Error('Unexpected fee API host')
    }
    result.blockedFeeRequests++
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Synthetic QA fee outage"}' })
  }
  await page.route('**/applications**', preventApplicationWrite)
  await page.route(selectedFee, failFee)
  result.stage = 'fee-outage'
  await page.goto(origin + '/en-CA/application', { waitUntil: 'domcontentloaded' })
  await expect.poll(() => result.blockedFeeRequests).toBeGreaterThan(0)
  await expect.poll(() => result.paymentMethod).toBe('DIRECT_PAY')
  await fillHostForm(page, result)
  result.stage = 'missing-fee-submit'
  await page.getByRole('button', { name: 'Proceed to Payment', exact: true }).click()
  await expect(page.getByText('Unable to load registration fee', { exact: true })).toBeVisible()
  await expect(page.getByText('We could not load the registration fee. Save your application, then refresh the page and try again.', { exact: true })).toBeVisible()
  await expect(page.getByText('Leave application and proceed to payment?', { exact: true })).toHaveCount(0)
  expect(new URL(page.url()).origin).toBe(origin)
  expect(result.blockedSubmissionAttempts).toBe(0)
  result.missingFeeBlockedBeforeSubmission = true
  result.stage = 'close-fee-error'
  // ModalBase has an icon Close and a text Close; use its text action.
  await page.getByRole('button', { name: 'Close', exact: true }).filter({ hasText: /^Close$/ }).click()
  await expect(page.getByText('Unable to load registration fee', { exact: true })).toHaveCount(0)
  await page.unroute('**/applications**', preventApplicationWrite)

  result.stage = 'save-draft-during-outage'
  const save = page.getByRole('button', { name: 'Save', exact: true })
  result.saveDraftAvailable = await save.count() === 1 && await save.isVisible()
  if (result.saveDraftAvailable) {
    const [response] = await Promise.all([
      page.waitForResponse(response => isApplicationWrite(response.request()), { timeout: 60000 }),
      save.click()
    ])
    result.draftSaveStatus = response.status()
    expect(response.ok()).toBe(true)
    const draft = await response.json()
    result.draftApplicationNumber = draft.header.applicationNumber
    result.draftStatus = draft.header.status
    expect(result.draftStatus).toBe('DRAFT')
    expect(draft.header.paymentToken == null).toBe(true)
    await page.waitForURL(url => url.searchParams.get('applicationId') === String(result.draftApplicationNumber))
    result.savedWithoutInvoice = true
  }

  result.stage = 'fee-recovery'
  await page.unroute(selectedFee, failFee)
  page.on('response', response => {
    const url = new URL(response.url())
    if (url.hostname.startsWith('pay-api-test-') && url.pathname === '/api/v1/fees/STRR/HOSTREG_1') {
      result.recoveryFeeStatuses.push(response.status())
    }
  })
  // Permit the documented refresh. No production application is touched.
  page.on('dialog', dialog => dialog.type() === 'beforeunload' ? dialog.accept() : dialog.dismiss())
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect.poll(() => result.recoveryFeeStatuses.includes(200), { timeout: 30000 }).toBe(true)
  if (result.draftApplicationNumber) {
    await expect(page.getByTestId('rental-unit-address-nickname')).toHaveValue(result.testFixture)
    for (let step = 0; step < 3; step++) await page.getByRole('button', { name: 'Next', exact: true }).click()
    await page.getByTestId('agreedToRentalAct-checkbox').check()
    await page.getByTestId('agreedToSubmit-checkbox').check()
    result.draftResumedAfterRefresh = true
  } else {
    await fillHostForm(page, result)
  }
  await submitHostPayment(page, result, card)
  result.result = 'passed'
}
