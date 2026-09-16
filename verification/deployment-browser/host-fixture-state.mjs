import { expect } from '@playwright/test'

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
