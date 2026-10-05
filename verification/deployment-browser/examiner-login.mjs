import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

// Only the existing legacy CI default/IDIR identity, one attempt, no record actions.
// Never save credentials, session storage, tokens, DOM, screenshots or raw errors.
const origin = 'https://dev.examiner-dashboard.shorttermrental.registry.gov.bc.ca'
const identityOrigin = 'https://logontest7.gov.bc.ca'
const identityPath = '/clp-cgi/int/logon.cgi'
const expectedBundleHash = '50f79a2128575e61f13e903594be4d98315f2b24c4af945c65c7c7b2f4bed1f4'
const report = {
  checkedAt: new Date().toISOString(), environment: process.env.VERIFY_ENVIRONMENT,
  harnessCommit: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID,
  scope: 'Existing runner-only IDIR login and read-only DEV Examiner dashboard/API checks. No record actions or access changes.',
  stage: 'credential-configuration', result: 'in_progress', loginAttempts: 0,
  authenticated: false, dashboardLoaded: false, browserErrors: 0,
  blockedWrites: 0, loginSyncRequests: 0, listResponses: [], identityResponses: [], browserErrorCategories: []
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
  expect(report.build.sha256).toBe(expectedBundleHash)

  browser = await chromium.launch({ channel: 'chrome' })
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
  page.on('pageerror', error => {
    report.browserErrors++
    const category = /SyntaxError/.test(error.name) ? 'syntax'
      : /TypeError/.test(error.name) ? 'type' : 'other'
    if (!report.browserErrorCategories.includes(category)) report.browserErrorCategories.push(category)
  })
  page.on('response', response => {
    const url = new URL(response.url())
    if (url.origin === identityOrigin && response.request().method() === 'POST' &&
        ['/clp-cgi/preLogon.cgi', identityPath].includes(url.pathname)) {
      report.identityResponses.push({ path: url.pathname, status: response.status() })
    }
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
  const finalAsset = await context.request.get(new URL(entry, origin).href)
  expect(finalAsset.status()).toBe(200)
  report.finalBundleHash = createHash('sha256').update(await finalAsset.body()).digest('hex')
  expect(report.finalBundleHash).toBe(expectedBundleHash)
  report.stage = 'complete'
  report.result = 'passed'
} catch (error) {
  report.error = { name: ['SyntaxError', 'TimeoutError'].includes(error.name) ? error.name : 'VerificationError', stage: report.stage }
  if (page && !page.isClosed()) {
    const current = new URL(page.url())
    report.finalLocation = current.origin === origin ? 'examiner' : current.origin === identityOrigin ? 'test-idir' : 'other'
    report.loginFieldsStillVisible = await page.locator('#user').isVisible().catch(() => false)
    // Classify visible failure text without exporting credentials, page text,
    // provider query strings, or an unredacted browser error.
    if ([origin, identityOrigin, 'https://dev.loginproxy.gov.bc.ca'].includes(current.origin)) {
      const visible = await page.locator('body').innerText().catch(() => '')
      report.visibleFailureCategories = Object.entries({
        invalidCredentials: /invalid (?:user|username|password|credentials)|incorrect (?:user|username|password)|authentication failed|logon failed|log in failed|not recognized/i,
        accountLocked: /account.{0,40}locked|locked.{0,40}account/i,
        passwordExpired: /password.{0,40}expired|change your password/i,
        mfaRequired: /multi.factor|verification code|one.time (?:code|password)|authenticator|approve.{0,30}sign.in/i,
        browserRequirement: /enable (?:cookies|javascript)|browser.{0,30}not supported|cookies.{0,30}required/i,
        missingInput: /(?:username|password).{0,25}required|enter your (?:username|password)/i,
        accessDenied: /access denied|not authorized|unauthorized/i
      }).filter(([, pattern]) => pattern.test(visible)).map(([category]) => category)
    }
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
