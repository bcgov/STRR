import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

// These existing CI credentials stay inside the runner. No traces, cookies,
// storage state, response bodies, or credentials are uploaded.
const username = process.env.PLAYWRIGHT_TEST_BCSC_USERNAME
const password = process.env.PLAYWRIGHT_TEST_BCSC_PASSWORD
// Observed in the authenticated TEST account chooser; the older configured
// Premium account name is absent from this identity's TEST memberships.
const account = 'STRR_TEST_29'
const secrets = [username, password].filter(Boolean)
const sanitize = value => {
  let text = String(value)
  for (const secret of secrets.filter(Boolean)) text = text.split(secret).join('[redacted]')
  return text
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[redacted-email]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted-token]')
    .replace(/(https?:\/\/[^\s"'<>?#]+)[?#][^\s"'<>]*/g, '$1?[redacted-query]')
}
const safeUrl = value => {
  const url = new URL(value)
  return sanitize(url.origin + url.pathname)
}
const apps = [
  { name: 'host', origin: 'https://test.host.shorttermrental.registry.gov.bc.ca', form: '/en-CA/application', feeCount: 3 },
  { name: 'platform', origin: 'https://test.platform.shorttermrental.registry.gov.bc.ca', form: '/en-CA/platform/application?override=true', feeCount: 3 },
  { name: 'strata', origin: 'https://test.stratahotel.shorttermrental.registry.gov.bc.ca', form: '/en-CA/strata-hotel/application', feeCount: 1 }
]
const report = {
  checkedAt: new Date().toISOString(),
  scope: 'Read-only deployed TEST BCSC login, account selection, payment-account and fee checks for Host, Platform and Strata. No checkout or application submission.',
  harnessCommit: process.env.GITHUB_SHA,
  runId: process.env.GITHUB_RUN_ID,
  credentialsConfigured: Boolean(username && password && account),
  apps: []
}
await mkdir('results', { recursive: true })
let browser
let page
let current
try {
  if (!report.credentialsConfigured) throw new Error('Required BCSC TEST credentials are not configured')
  browser = await chromium.launch()
  const context = await browser.newContext()
  context.setDefaultTimeout(20000)
  context.setDefaultNavigationTimeout(60000)

  for (const app of apps) {
    current = { name: app.name, origin: app.origin, stage: 'login', paymentRequests: [], browserErrors: [], result: 'in_progress' }
    report.apps.push(current)
    const appResult = current
    const publicHtml = await fetch(app.origin + '/en-CA/auth/login').then(r => { if (!r.ok) throw new Error('TEST entry page unavailable'); return r.text() })
    const entryPaths = [...publicHtml.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g)].map(m => m[1])
    if (!entryPaths.length) throw new Error('No deployed TEST entry bundle found')
    current.deployedEntryBundles = []
    for (const entry of entryPaths) {
      const url = new URL(entry, app.origin)
      if (url.origin !== app.origin || !url.pathname.startsWith('/_nuxt/')) throw new Error('Unexpected TEST entry bundle origin or path')
      const response = await fetch(url)
      if (!response.ok) throw new Error('TEST entry bundle unavailable')
      const bytes = Buffer.from(await response.arrayBuffer())
      current.deployedEntryBundles.push({ path: url.pathname, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
    }
    page = await context.newPage()
    const pending = []
    page.on('pageerror', error => appResult.browserErrors.push(sanitize(error.message)))
    page.on('response', response => {
      const url = new URL(response.url())
      if (url.hostname !== 'pay-api-test-129641755850.northamerica-northeast1.run.app') return
      if (!/^\/api\/v1\/(fees\/STRR\/|accounts\/)/.test(url.pathname)) return
      const item = {
        method: response.request().method(),
        path: url.pathname.replace(/\/accounts\/[^/]+/, '/accounts/[account]'),
        status: response.status()
      }
      appResult.paymentRequests.push(item)
      if (/\/accounts\//.test(url.pathname) && response.ok()) {
        pending.push(response.json().then(body => {
          appResult.paymentAccount = {
            paymentMethod: body.paymentMethod,
            cfsStatus: body.cfsAccount?.status
          }
        }).catch(() => {}))
      }
    })

    await page.goto(app.origin + '/en-CA/auth/login', { waitUntil: 'domcontentloaded' })
    const loginButton = page.getByRole('button', { name: 'Continue with BC Services Card', exact: true })
    await Promise.race([
      loginButton.waitFor({ state: 'visible' }),
      page.waitForURL(url => url.origin === app.origin && !url.pathname.endsWith('/auth/login'))
    ])
    if (await loginButton.isVisible()) await loginButton.click()
    if (app.name === 'host') {
      await page.getByRole('button', { name: 'Log in with Test with username and password', exact: true }).click()
      if (new URL(page.url()).hostname !== 'idtest.gov.bc.ca') {
        throw new Error('Refusing to enter the TEST credentials on an unexpected identity provider')
      }
      await page.getByLabel('Email or username', { exact: true }).fill(username)
      await page.getByLabel('Password', { exact: true }).fill(password)
      await page.getByRole('button', { name: 'Continue', exact: true }).click()
    }
    await page.waitForURL(url => url.origin === app.origin && !url.pathname.endsWith('/auth/login'), { timeout: 45000 })
    current.loginPassed = true
    current.stage = 'select-test-account'
    await page.goto(app.origin + '/en-CA/auth/account/choose-existing', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('choose-existing-account-button').first().waitFor({ state: 'visible' })
    const accountButton = page.getByRole('button', { name: 'Use this Account, ' + account, exact: true })
    current.testAccountAvailable = await accountButton.isVisible() && await accountButton.isEnabled()
    if (!current.testAccountAvailable) throw new Error('Expected authorized TEST account is unavailable')
    await accountButton.click()
    current.accountSelected = true
    current.stage = 'open-application'
    await page.goto(app.origin + app.form, { waitUntil: 'domcontentloaded' })
    await page.getByTestId('h1').waitFor({ state: 'visible' })
    current.stage = 'load-payment-account-and-fees'
    const deadline = Date.now() + 30000
    while (Date.now() < deadline) {
      const fees = new Set(current.paymentRequests.filter(r => r.path.includes('/fees/STRR/') && r.status === 200).map(r => r.path))
      const accountLoaded = current.paymentRequests.some(r => r.path.includes('/accounts/') && r.status === 200)
      if (fees.size >= app.feeCount && accountLoaded) break
      await new Promise(resolve => setTimeout(resolve, 250))
    }
    await Promise.all(pending)
    const fees = new Set(current.paymentRequests.filter(r => r.path.includes('/fees/STRR/') && r.status === 200).map(r => r.path))
    if (fees.size < app.feeCount || !current.paymentAccount) throw new Error('TEST payment account or required registration fees did not load successfully')
    current.requiredFeeCount = app.feeCount
    current.loadedFeeCount = fees.size
    if (current.paymentAccount.paymentMethod !== 'DIRECT_PAY') throw new Error('TEST account payment method changed; checkout assumptions need review')
    current.result = current.browserErrors.length ? 'failed_browser_errors' : 'passed'
    current.stage = 'complete'
    if (current.result !== 'passed') process.exitCode = 1
    const finalHtml = await fetch(app.origin + '/en-CA/auth/login').then(r => r.text())
    current.bundlePathsStable = current.deployedEntryBundles.every(b => finalHtml.includes(b.path))
    if (!current.bundlePathsStable) { current.result = 'deployment_changed'; process.exitCode = 1 }
    current.finalUrl = safeUrl(page.url())
    await page.close()
  }
} catch (error) {
  report.error = sanitize(error.message)
  if (current) current.result = 'failed'
  if (page && !page.isClosed()) {
    if (current) current.finalUrl = safeUrl(page.url())
    // Deliberately omit raw DOM, arbitrary account labels, response bodies and traces.
    report.failureStage = current?.stage

  }
  process.exitCode = 1
} finally {
  await browser?.close()
  const sanitizeValues = value => typeof value === 'string' ? sanitize(value)
    : Array.isArray(value) ? value.map(sanitizeValues)
      : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeValues(item)]))
        : value
  const sanitizedReport = JSON.stringify(sanitizeValues(report), null, 2)
  await writeFile('results/preflight.json', sanitizedReport + '\n')
  console.log(sanitizedReport)
}
