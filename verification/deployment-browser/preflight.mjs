import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { verifyHostFee } from './host-fee.mjs'
import { inspectHostFixture } from './host-fixture-state.mjs'

// Read-only by default; the explicit TEST scenario allows one synthetic checkout.
// Never export storage, credentials, response bodies, or raw error text.
const environment = process.env.VERIFY_ENVIRONMENT
if (!['dev', 'test'].includes(environment)) throw new Error('Only DEV and TEST are allowed')
const scenario = process.env.VERIFY_SCENARIO || 'read-only'
if (!['read-only', 'host-fee', 'host-fixture-state'].includes(scenario)) throw new Error('Unknown verification scenario')
if (scenario !== 'read-only' && environment !== 'test') throw new Error('Host fixture scenarios are TEST only')
const origin = `https://${environment}.host.shorttermrental.registry.gov.bc.ca`
const username = process.env.PLAYWRIGHT_TEST_BCSC_USERNAME
const password = process.env.PLAYWRIGHT_TEST_BCSC_PASSWORD
const report = {
  checkedAt: new Date().toISOString(), environment, scenario,
  harnessCommit: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID,
  scope: scenario === 'host-fee' ? 'Host missing-fee guard, draft recovery when enabled, and one fresh sandbox checkout with cancel/resume and receipt verification.' : 'Read-only BCSC login, known synthetic account, dashboard and scoped synthetic fixture state.',
  stage: 'setup', result: 'in_progress', responses: [], browserErrorCount: 0
}
await mkdir('results', { recursive: true })
let browser
try {
  if (!username || !password) throw new Error('Runner credentials unavailable')
  browser = await chromium.launch()
  const context = await browser.newContext()
  context.setDefaultTimeout(20000)
  context.setDefaultNavigationTimeout(60000)
  const page = await context.newPage()
  const pending = []
  page.on('pageerror', () => report.browserErrorCount++)
  page.on('response', response => {
    const url = new URL(response.url())
    let category
    if (url.hostname.startsWith(`strr-api-${environment}-`) && /^(?:\/api\/v1)?\/applications\/?$/.test(url.pathname)) category = 'applications'
    if (url.hostname.startsWith(`strr-api-${environment}-`) && /^(?:\/api\/v1)?\/registrations\/?$/.test(url.pathname)) category = 'registrations'
    if (url.hostname.startsWith(`pay-api-${environment}-`) && url.pathname.startsWith('/api/v1/fees/STRR/')) category = 'fees'
    if (url.hostname.startsWith(`pay-api-${environment}-`) && /^\/api\/v1\/accounts\/[^/]+\/?$/.test(url.pathname)) category = 'payment-account'
    if (!category || response.request().method() !== 'GET') return
    report.responses.push({ category, status: response.status() })
    if (category === 'applications' && response.ok()) pending.push(response.json().then(body => {
      const applications = body.applications ?? body
      if (Array.isArray(applications)) report.applicationCount = applications.length
    }).catch(() => {}))
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
  const button = page.getByRole('button', { name: 'Use this Account, STRR_TEST_29', exact: true })
  report.knownSyntheticAccountAvailable = await button.count() === 1 && await button.isEnabled()
  if (!report.knownSyntheticAccountAvailable) throw new Error('Known synthetic account unavailable')
  await button.click()
  report.accountSelected = true
  report.stage = 'dashboard'
  await page.waitForURL(url => url.origin === origin && !url.pathname.includes('/auth/'), { timeout: 45000 })
  await page.goto(origin + '/en-CA/dashboard', { waitUntil: 'domcontentloaded' })
  await page.getByTestId('h1').waitFor({ state: 'visible' })
  await expect.poll(() => report.responses.some(item => item.category === 'applications' && item.status === 200), { timeout: 30000 }).toBe(true)
  await Promise.all(pending)
  report.dashboardLoaded = true
  if (scenario === 'host-fee') {
    report.stage = 'host-fee-verification'
    await verifyHostFee(page, report)
  } else if (scenario === 'host-fixture-state') {
    report.stage = 'inspect-existing-fixture'
    await inspectHostFixture(page, report)
  } else {
    report.stage = 'registration-fees'
    await page.goto(origin + '/en-CA/application', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('h1').waitFor({ state: 'visible' })
    await expect.poll(() => report.responses.filter(item => item.category === 'fees' && item.status === 200).length, { timeout: 30000 }).toBeGreaterThanOrEqual(3)
    expect(report.responses.some(item => item.category === 'payment-account' && item.status === 200)).toBe(true)
  }
  expect(report.browserErrorCount).toBe(0)
  report.stage = 'complete'
  report.result = 'passed'
} catch (error) {
  report.error = { name: error.name, stage: report.hostFee?.stage ?? report.stage }
  report.result = 'failed'
  process.exitCode = 1
} finally {
  await browser?.close()
  const json = JSON.stringify(report, null, 2)
  await writeFile('results/preflight.json', json + '\n')
  console.log(json)
}
