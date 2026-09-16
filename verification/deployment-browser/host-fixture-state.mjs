import { expect } from '@playwright/test'
import { finishHostCheckout } from './host-checkout.mjs'
import { loadTestCard } from './payment-helpers.mjs'

// Read-only recovery audit for the fixture created by the failed QA run.
export async function inspectHostFixture(page, report) {
  if (process.env.VERIFY_ENVIRONMENT !== 'test') throw new Error('Fixture audit is TEST only')
  const apiOrigin = 'https://strr-api-test-166050292631.northamerica-northeast1.run.app'
  const fixture = 'Host Fee Guard QA 35136186664'
  const applicationNumber = '96898009237260'
  const [listResponse] = await Promise.all([
    page.waitForResponse(response => response.url().startsWith(apiOrigin + '/applications?') && response.request().method() === 'GET'),
    page.reload({ waitUntil: 'domcontentloaded' })
  ])
  expect(listResponse.ok()).toBe(true)
  const requestHeaders = await listResponse.request().allHeaders()
  const headers = { authorization: requestHeaders.authorization, 'account-id': requestHeaders['account-id'] }
  const list = await listResponse.json()
  const summarize = body => ({
    applicationNumber: body.header?.applicationNumber,
    status: body.header?.status, paymentStatus: body.header?.paymentStatus,
    invoiceId: body.header?.paymentToken,
    fixtureMatches: JSON.stringify(body).includes(JSON.stringify(fixture))
  })
  const response = await page.request.get(apiOrigin + '/applications/' + applicationNumber, { headers })
  report.fixtureState = { requestedApplication: applicationNumber, httpStatus: response.status() }
  expect(response.ok()).toBe(true)
  report.fixtureState.application = summarize(await response.json())
  report.fixtureState.matchingListEntries = (list.applications ?? []).filter(item =>
    JSON.stringify(item).includes(JSON.stringify(fixture))).map(summarize)
  expect(report.fixtureState.application.fixtureMatches).toBe(true)
}

export async function resumeHostFixture(page, report) {
  await inspectHostFixture(page, report)
  const state = report.fixtureState.application
  expect(state.applicationNumber).toBe('96898009237260')
  expect(state.invoiceId).toBe(771759)
  expect(state.status).toBe('PAYMENT_DUE')
  expect(state.paymentStatus).toBe('CREATED')
  expect(report.fixtureState.matchingListEntries).toHaveLength(1)
  const result = report.hostFee = {
    testFixture: 'Host Fee Guard QA 35136186664',
    applicationNumber: state.applicationNumber, invoiceId: state.invoiceId,
    resumedExistingUnpaidInvoice: true, submissionVerifiedByRead: true,
    stage: 'open-existing-unpaid-application'
  }
  const card = loadTestCard([])
  await page.goto('https://test.host.shorttermrental.registry.gov.bc.ca/en-CA/dashboard/' + state.applicationNumber,
    { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('h1')).toContainText(result.testFixture)
  await page.getByRole('button', { name: 'Pay Now', exact: true }).click()
  await finishHostCheckout(page, result, card)
  result.result = 'passed'
}
