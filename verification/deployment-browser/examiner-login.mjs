import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

// Only the existing legacy CI default/IDIR identity, one attempt, no record actions.
// Never save credentials, session storage, tokens, DOM, screenshots or raw errors.
const origin = 'https://dev.examiner-dashboard.shorttermrental.registry.gov.bc.ca'
const identityOrigin = 'https://logontest7.gov.bc.ca'
const identityPath = '/clp-cgi/int/logon.cgi'
const report = {
  checkedAt: new Date().toISOString(), environment: process.env.VERIFY_ENVIRONMENT,
  harnessCommit: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID,
  scope: 'Existing runner-only IDIR login and read-only DEV Examiner dashboard/API checks. No record actions or access changes.',
  stage: 'credential-configuration', result: 'in_progress', loginAttempts: 0,
  authenticated: false, dashboardLoaded: false, browserErrors: 0,
  blockedWrites: 0, loginSyncRequests: 0, listResponses: []
}
let browser
let page
try {
  if (process.env.VERIFY_ENVIRONMENT !== 'dev') throw new Error('DEV only')
  const users = JSON.parse(process.env.LEGACY_CYPRESS_USERS || 'null')
  if (!Array.isArray(users)) throw new Error('Credential array unavailable')
  const entries = users.filter(item => item?.type === 'default')
  if (entries.length !== 1) throw new Error('Ambiguous credential configuration')
  const { username, password } = entries[0]
  if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password) {
    throw new Error('Credential fields unavailable')
  }
  report.stage = 'public-build'
  const response = await fetch(origin + '/en-CA/auth/login')
  expect(response.status).toBe(200)
  const html = await response.text()
  const entry = /<script[^>]+src="([^" ]*\/_nuxt\/[^" ]+\.js)"/.exec(html)?.[1]
  if (!entry || new URL(entry, origin).origin !== origin) throw new Error('Unexpected entry asset')
  const asset = await fetch(new URL(entry, origin))
  expect(asset.status).toBe(200)
  const bytes = Buffer.from(await asset.arrayBuffer())
  report.build = { entry, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }

  browser = await chromium.launch()
  const context = await browser.newContext({ serviceWorkers: 'block' })
  context.setDefaultTimeout(20000)
  context.setDefaultNavigationTimeout(45000)
  await context.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const applicationApi = /^(strr|pay|auth)-api-/.test(url.hostname)
    const loginSync = url.hostname.startsWith('strr-api-dev-') && url.pathname === '/users' && request.method() === 'POST'
    if (loginSync) report.loginSyncRequests++
    if ((applicationApi || url.origin === origin) && !loginSync && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      report.blockedWrites++
      await route.abort('blockedbyclient')
    } else await route.continue()
  })
  page = await context.newPage()
  page.on('pageerror', () => report.browserErrors++)
  page.on('response', response => {
    const url = new URL(response.url())
    if (url.hostname.startsWith('strr-api-dev-') && response.request().method() === 'GET' &&
        ['/applications', '/applications/search', '/registrations/search'].includes(url.pathname)) {
      report.listResponses.push({ resource: url.pathname, status: response.status() })
    }
  })
  report.stage = 'identity-provider'
  await page.goto(origin + '/en-CA/auth/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Continue with IDIR', exact: true }).click()
  await page.locator('#user').waitFor({ state: 'visible' })
  const destination = new URL(page.url())
  expect(destination.origin).toBe(identityOrigin)
  expect(destination.pathname).toBe(identityPath)
  const form = await page.locator('#user').evaluate(input => {
    const action = new URL(input.form.action)
    return { origin: action.origin, path: action.pathname, method: input.form.method }
  })
  expect(form).toEqual({ origin: identityOrigin, path: '/clp-cgi/preLogon.cgi', method: 'post' })
  report.credentialDestinationVerified = true
  report.stage = 'idir-authentication'
  await page.locator('#user').fill(username)
  await page.locator('#password').fill(password)
  report.loginAttempts++
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.waitForURL(url => url.origin === origin && url.pathname === '/en-CA/dashboard')
  report.returnedToDashboard = true
  report.stage = 'staff-dashboard'
  await expect(page.getByTestId('examiner-dashboard-page')).toBeVisible()
  await expect.poll(() => report.listResponses.some(item => item.status === 200), { timeout: 30000 }).toBe(true)
  report.authenticated = true
  report.dashboardLoaded = true
  expect(report.browserErrors).toBe(0)
  expect(report.blockedWrites).toBe(0)
  report.stage = 'complete'
  report.result = 'passed'
} catch (error) {
  report.error = { name: ['SyntaxError', 'TimeoutError'].includes(error.name) ? error.name : 'VerificationError', stage: report.stage }
  if (page && !page.isClosed()) {
    const current = new URL(page.url())
    report.finalLocation = current.origin === origin ? 'examiner' : current.origin === identityOrigin ? 'test-idir' : 'other'
    report.loginFieldsStillVisible = await page.locator('#user').isVisible().catch(() => false)
  }
  report.result = 'failed'
  process.exitCode = 1
} finally {
  await browser?.close()
  await mkdir('results', { recursive: true })
  const json = JSON.stringify(report, null, 2) + '\n'
  await writeFile('results/examiner-login.json', json)
  console.log(json)
}
