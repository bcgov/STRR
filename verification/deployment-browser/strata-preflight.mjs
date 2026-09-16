import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const environment = process.env.VERIFY_ENVIRONMENT
if (!['dev', 'test'].includes(environment)) throw new Error('Only DEV and TEST are allowed')
const origin = `https://${environment}.stratahotel.shorttermrental.registry.gov.bc.ca`
const dashboard = origin + '/en-CA/strata-hotel/dashboard'
const errorText = 'Unable to load your strata-titled hotels and motels'
const emptyText = 'You don’t have any strata-titled hotels or motels yet. Add a strata-titled hotel or motel above.'
const report = {
  checkedAt: new Date().toISOString(), environment, scenario: 'strata-list',
  harnessCommit: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID,
  scope: 'Read-only Strata login, real list, browser-injected list failure/retry and empty-response control. No payments or application writes.',
  stage: 'setup', result: 'in_progress', browserErrorCount: 0, applicationWriteAttempts: 0,
  requests: [], phases: {}
}
await mkdir('results', { recursive: true })
let browser
let phase = 'live-before'
const isList = request => {
  const url = new URL(request.url())
  return url.hostname.startsWith(`strr-api-${environment}-`) && url.pathname === '/applications' &&
    request.method() === 'GET' && url.searchParams.get('registrationType') === 'STRATA_HOTEL'
}
try {
  const username = process.env.PLAYWRIGHT_TEST_BCSC_USERNAME
  const password = process.env.PLAYWRIGHT_TEST_BCSC_PASSWORD
  if (!username || !password) throw new Error('Runner credentials unavailable')
  browser = await chromium.launch()
  const context = await browser.newContext()
  context.setDefaultTimeout(20000)
  context.setDefaultNavigationTimeout(60000)
  const page = await context.newPage()
  page.on('pageerror', () => report.browserErrorCount++)
  await page.route('**/applications**', async route => {
    const request = route.request()
    if (!['GET', 'OPTIONS'].includes(request.method())) {
      report.applicationWriteAttempts++
      await route.abort('blockedbyclient')
    } else if (isList(request) && phase === 'failure') {
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Synthetic QA list outage"}' })
    } else if (isList(request) && phase === 'empty-control') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"applications":[],"total":0}' })
    } else await route.continue()
  })
  page.on('response', response => {
    if (!isList(response.request())) return
    const url = new URL(response.url())
    report.requests.push({ phase, status: response.status(), page: url.searchParams.get('page'),
      limit: url.searchParams.get('limit'), registrationType: url.searchParams.get('registrationType') })
  })

  report.stage = 'login'
  await page.goto(origin + '/en-CA/auth/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Continue with BC Services Card', exact: true }).click()
  await page.getByRole('button', { name: 'Log in with Test with username and password', exact: true }).click()
  if (new URL(page.url()).hostname !== 'idtest.gov.bc.ca') throw new Error('Unexpected credential destination')
  await page.getByLabel('Email or username', { exact: true }).fill(username)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.waitForURL(url => url.origin === origin && !url.pathname.endsWith('/auth/login'), { timeout: 45000 })
  report.authenticated = true
  report.stage = 'choose-synthetic-account'
  await page.goto(origin + '/en-CA/auth/account/choose-existing', { waitUntil: 'domcontentloaded' })
  await page.getByTestId('choose-existing-account-button').first().waitFor({ state: 'visible' })
  const account = page.getByRole('button', { name: 'Use this Account, STRR_TEST_29', exact: true })
  report.knownSyntheticAccountAvailable = await account.count() === 1 && await account.isEnabled()
  if (!report.knownSyntheticAccountAvailable) throw new Error('Known synthetic account unavailable')
  await account.click()
  await page.waitForURL(url => url.origin === origin && !url.pathname.includes('/auth/'), { timeout: 45000 })
  report.accountSelected = true

  async function checkLiveList(action) {
    const [response] = await Promise.all([
      page.waitForResponse(response => isList(response.request()), { timeout: 30000 }), action()
    ])
    expect(response.status()).toBe(200)
    const body = await response.json()
    report.phases[phase] = { status: response.status(), applicationCount: body.applications.length, total: body.total }
    expect(body.applications.length).toBeGreaterThan(0)
    await expect(page.getByRole('table')).toBeVisible()
    const number = String(body.applications[0].header.registrationNumber || body.applications[0].header.applicationNumber)
    await expect(page.getByRole('table').getByText(number, { exact: true })).toBeVisible()
    await expect(page.getByText(errorText, { exact: true })).toHaveCount(0)
    report.phases[phase].realRowVisible = true
  }

  report.stage = 'live-list-before'
  await checkLiveList(() => page.goto(dashboard, { waitUntil: 'domcontentloaded' }))
  phase = 'failure'
  report.stage = 'injected-list-failure'
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('alert').filter({ hasText: errorText })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try Again', exact: true })).toBeVisible()
  await expect(page.getByText(emptyText, { exact: true })).toHaveCount(0)
  await expect(page.getByRole('table')).toHaveCount(0)
  expect(report.requests.some(request => request.phase === 'failure' && request.status === 503)).toBe(true)
  report.phases.failure = { errorVisible: true, retryVisible: true, falseEmptyMessage: false, staleTable: false }

  phase = 'retry-live'
  report.stage = 'retry-live-list'
  await checkLiveList(() => page.getByRole('button', { name: 'Try Again', exact: true }).click())
  phase = 'empty-control'
  report.stage = 'successful-empty-control'
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText(emptyText, { exact: true })).toBeVisible()
  await expect(page.getByText(errorText, { exact: true })).toHaveCount(0)
  report.phases.emptyControl = { emptyMessageVisible: true, errorVisible: false, browserSyntheticResponse: true }

  phase = 'live-after'
  report.stage = 'restore-live-list'
  await checkLiveList(() => page.reload({ waitUntil: 'domcontentloaded' }))
  expect(report.browserErrorCount).toBe(0)
  expect(report.applicationWriteAttempts).toBe(0)
  report.stage = 'complete'
  report.result = 'passed'
} catch (error) {
  report.result = 'failed'
  report.error = { name: error.name, stage: report.stage,
    category: /strict mode violation/.test(error.message) ? 'ambiguous-locator' :
      /No resource with given identifier|No data found|Network.getResponseBody/.test(error.message) ? 'response-body-unavailable' : 'other' }
  process.exitCode = 1
} finally {
  await browser?.close()
  const json = JSON.stringify(report, null, 2)
  await writeFile('results/strata-preflight.json', json + '\n')
  console.log(json)
}
