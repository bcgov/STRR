import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { loadTestCard, preparePlatformCheckout } from './platform-checkout.mjs'
import { createStrataPayment } from './strata-checkout.mjs'
import { createHostPayment } from './host-checkout.mjs'

// Real deployed DEV assets and services only. No routes, response bodies,
// screenshots, traces, browser state, or secret values are exported.
const username = process.env.PLAYWRIGHT_TEST_BCSC_USERNAME
const password = process.env.PLAYWRIGHT_TEST_BCSC_PASSWORD
const account = 'STRR_TEST_29'
const configuredCiAccount = process.env.PLAYWRIGHT_TEST_BCSC_PREMIUM_ACCOUNT_NAME?.trim()
// Real DEV account, enabled DIRECT_PAY in all three apps in run 37345830995.
const verifiedDevCiAccountHash = 'f369e346b37d80239143529831179e3c89a904c1cd9684f04b837670a97d5f11'
const mode = process.env.QA_MODE || 'read-only'
const secrets = [username, password, process.env.PLAYWRIGHT_TEST_BCSC_PREMIUM_ACCOUNT_NAME, configuredCiAccount].filter(Boolean)
const sanitize = value => {
  let text = String(value)
  for (const secret of secrets) text = text.split(secret).join('[redacted]')
  return text.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[redacted-email]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted-token]')
    .replace(/(https?:\/\/[^\s"'<>?#]+)[?#][^\s"'<>]*/g, '$1?[redacted-query]')
}
const safeUrl = value => { const url = new URL(value); return sanitize(url.origin + url.pathname) }
const apps = [
  { name: 'host', origin: 'https://dev.host.shorttermrental.registry.gov.bc.ca', form: '/en-CA/application', dashboard: '/en-CA/dashboard', feeCount: 3 },
  { name: 'platform', origin: 'https://dev.platform.shorttermrental.registry.gov.bc.ca', form: '/en-CA/platform/application?override=true', dashboard: '/en-CA/platform/dashboard', feeCount: 3 },
  { name: 'strata', origin: 'https://dev.stratahotel.shorttermrental.registry.gov.bc.ca', form: '/en-CA/strata-hotel/application', dashboard: '/en-CA/strata-hotel/dashboard', feeCount: 1 }
].filter(app => process.env.TEST_APP === 'all' || app.name === process.env.TEST_APP)
const report = {
  checkedAt: new Date().toISOString(), environment: 'dev', mode,
  scope: 'Actual deployed DEV login, account, dashboards and fees. Checkout mode adds fresh synthetic sandbox payments, Host cancel/resume, receipts and persisted same-invoice status. No candidate asset overlay.',
  requestedApps: apps.map(app => app.name),
  requestedSourceCommit: process.env.CANDIDATE_COMMIT,
  harnessCommit: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID,
  apps: []
}
await mkdir('results', { recursive: true })
let browser
let page
let current
const captureBuild = async (context, app, expected) => {
  const response = await context.request.get(app.origin + '/en-CA/auth/login')
  expect(response.status()).toBe(200)
  const html = await response.text()
  const entryPath = /<script[^>]+src="([^" ]*\/_nuxt\/[^" ]+\.js)"/.exec(html)?.[1]
  if (!entryPath || new URL(entryPath, app.origin).origin !== app.origin) throw new Error('Unexpected entry asset')
  const entryResponse = await context.request.get(new URL(entryPath, app.origin).href)
  expect(entryResponse.status()).toBe(200)
  const body = await entryResponse.body()
  const sha256 = createHash('sha256').update(body).digest('hex')
  expect(sha256).toBe(expected)
  return { entryPath, sha256, bytes: body.length }
}
try {
  if (!['read-only', 'checkout'].includes(mode) || !apps.length) throw new Error('Invalid verification scope')
  if (!username || !password) throw new Error('Required BCSC test credentials are not configured')
  if (mode === 'checkout' && Number(process.env.GITHUB_RUN_ATTEMPT || '1') !== 1) throw new Error('Refusing checkout on a rerun; inspect existing invoices first')
  const expectedBuilds = JSON.parse(process.env.EXPECTED_BUNDLE_HASHES || '{}')
  for (const app of apps) if (!/^[a-f0-9]{64}$/.test(expectedBuilds[app.name] || '')) throw new Error('Expected deployed build hash missing')
  const card = mode === 'checkout' ? loadTestCard(secrets) : undefined
  report.sandboxCardFixtureUsable = Boolean(card)
  browser = await chromium.launch({ channel: 'chrome' })
  report.browserVersion = browser.version()
  const context = await browser.newContext({ serviceWorkers: 'block' })
  context.setDefaultTimeout(20000)
  context.setDefaultNavigationTimeout(60000)
  for (const app of apps) {
    current = { name: app.name, stage: 'deployed-build', paymentRequests: [], dashboardRequests: [], browserErrorCount: 0, consoleErrorCount: 0, failedAssetCount: 0, cacheValidatedAssetCount: 0, abortedAssetRequestCount: 0, assetEvents: [], omittedAssetEventCount: 0, result: 'in_progress' }
    report.apps.push(current)
    const item = current
    try {
      current.deployedBefore = await captureBuild(context, app, expectedBuilds[app.name])
      page = await context.newPage()
      const observedPage = page
      const pending = []
      const recordAssetEvent = (url, category) => {
        if (category === 'aborted') item.abortedAssetRequestCount++
        else item.failedAssetCount++
        const path = /^\/_nuxt\/[A-Za-z0-9_./-]+\.(js|css)$/.test(url.pathname)
          ? url.pathname.slice(0, 240) : '[other-same-origin-js-css]'
        const existing = item.assetEvents.find(event => event.path === path && event.category === category)
        if (existing) existing.count++
        else if (item.assetEvents.length < 40) item.assetEvents.push({ path, category, count: 1 })
        else item.omittedAssetEventCount++
      }
      let observeSelectedAccount = false
      const selectedAccountRequests = new WeakSet()
      page.on('pageerror', () => item.browserErrorCount++)
      page.on('console', message => {
        if (message.type() === 'error' && new URL(observedPage.url()).origin === app.origin) item.consoleErrorCount++
      })
      page.on('request', request => {
        if (observeSelectedAccount) selectedAccountRequests.add(request)
      })
      page.on('requestfailed', request => {
        const url = new URL(request.url())
        if (url.origin !== app.origin || !/\.(js|css)$/.test(url.pathname)) return
        const error = request.failure()?.errorText || ''
        const category = error === 'net::ERR_ABORTED' ? 'aborted'
          : /ERR_(NAME_NOT_RESOLVED|DNS_)/.test(error) ? 'dns'
            : /ERR_CERT_|ERR_SSL_/.test(error) ? 'tls'
              : /ERR_(TIMED_OUT|CONNECTION_TIMED_OUT)/.test(error) ? 'timeout'
                : /ERR_CONNECTION_/.test(error) ? 'connection'
                  : /ERR_BLOCKED_BY_/.test(error) ? 'blocked' : 'network'
        recordAssetEvent(url, category)
      })
      page.on('response', response => {
        const url = new URL(response.url())
        if (url.origin === app.origin && /\.(js|css)$/.test(url.pathname)) {
          if (response.status() === 304) item.cacheValidatedAssetCount++
          else if (response.status() >= 400) recordAssetEvent(url, 'http-' + response.status())
        }
        if (!selectedAccountRequests.has(response.request())) return
        if (url.hostname === 'strr-api-dev-i2rbretwta-nn.a.run.app' && response.request().method() === 'GET' &&
            ['/applications', '/registrations'].includes(url.pathname)) {
          item.dashboardRequests.push({ path: url.pathname, status: response.status() })
        }
        if (url.hostname !== 'pay-api-dev-142173140222.northamerica-northeast1.run.app' ||
            !/^\/api\/v1\/(fees\/STRR\/|accounts\/)/.test(url.pathname)) return
        item.paymentRequests.push({ method: response.request().method(),
          path: url.pathname.replace(/\/accounts\/[^/]+/, '/accounts/[account]'), status: response.status() })
        if (/\/accounts\//.test(url.pathname) && response.ok()) pending.push(response.json().then(body => {
          item.paymentAccount = { paymentMethod: body.paymentMethod, cfsStatus: body.cfsAccount?.status }
        }).catch(() => {}))
      })
      current.stage = 'public-config'
      await page.goto(app.origin + '/en-CA/auth/login', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => window.__NUXT__?.config?.public)
      const config = await page.evaluate(() => window.__NUXT__.config.public)
      expect(new URL(config.baseUrl).origin).toBe(app.origin)
      expect(new URL(config.payApiURL).hostname).toBe('pay-api-dev-142173140222.northamerica-northeast1.run.app')
      expect(new URL(config.strrApiURL).hostname).toBe('strr-api-dev-i2rbretwta-nn.a.run.app')
      expect(new URL(config.paymentPortalUrl).hostname).toBe('dev.account.bcregistry.gov.bc.ca')
      expect(new URL(config.keycloakAuthUrl).hostname).toBe('dev.loginproxy.gov.bc.ca')
      current.publicConfigVerified = true
      current.stage = 'login'
      const loginButton = page.getByRole('button', { name: 'Continue with BC Services Card', exact: true })
      await Promise.race([
        loginButton.waitFor({ state: 'visible' }),
        page.waitForURL(url => url.origin === app.origin && !url.pathname.endsWith('/auth/login'))
      ])
      if (await loginButton.isVisible()) await loginButton.click()
      const testLogin = page.getByRole('button', { name: 'Log in with Test with username and password', exact: true })
      await Promise.race([
        testLogin.waitFor({ state: 'visible' }),
        page.waitForURL(url => url.origin === app.origin && !url.pathname.endsWith('/auth/login'))
      ])
      if (await testLogin.isVisible()) {
        await testLogin.click()
        if (new URL(page.url()).hostname !== 'idtest.gov.bc.ca') throw new Error('Unexpected credential destination')
        current.credentialDestinationVerified = true
        await page.getByLabel('Email or username', { exact: true }).fill(username)
        await page.getByLabel('Password', { exact: true }).fill(password)
        await page.getByRole('button', { name: 'Continue', exact: true }).click()
      }
      await page.waitForURL(url => url.origin === app.origin && !url.pathname.endsWith('/auth/login'), { timeout: 45000 })
      current.authenticated = true
      current.stage = 'select-synthetic-account'
      await page.goto(app.origin + '/en-CA/auth/account/choose-existing', { waitUntil: 'domcontentloaded' })
      await page.getByTestId('choose-existing-account-button').first().waitFor({ state: 'visible' })
      let accountButton = page.getByRole('button', { name: 'Use this Account, ' + account, exact: true })
      current.syntheticAccountAvailable = await accountButton.count() === 1 && await accountButton.isEnabled()
      if (current.syntheticAccountAvailable && mode !== 'checkout') current.accountFixtureSource = 'approved-synthetic'
      // The repository's existing Playwright helpers designate this CI account.
      // Checkout is restricted to the exact fixture verified in DEV before this run.
      if (!current.syntheticAccountAvailable || mode === 'checkout') {
        const configuredButton = configuredCiAccount
          ? page.getByRole('button', { name: 'Use this Account, ' + configuredCiAccount, exact: true }) : undefined
        const matchCount = configuredButton ? await configuredButton.count() : 0
        const enabled = matchCount === 1 && await configuredButton.isEnabled()
        current.configuredCiAccount = { configured: Boolean(configuredCiAccount), matchCount, enabled,
          labelSha256: configuredCiAccount ? createHash('sha256')
            .update(configuredCiAccount.replace(/\s+/g, ' ').toLowerCase()).digest('hex') : undefined }
        if (mode === 'checkout') {
          expect(current.configuredCiAccount.labelSha256).toBe(verifiedDevCiAccountHash)
          expect(enabled).toBe(true)
          current.checkoutFixtureVerified = true
        }
        if (enabled) {
          accountButton = configuredButton
          current.accountFixtureSource = 'existing-playwright-ci-account'
        }
      }
      if (!current.accountFixtureSource) {
        current.missingPrerequisite = mode === 'checkout' ? 'approved-dev-synthetic-account' : 'available-designated-dev-test-account'
        const choices = page.getByTestId('choose-existing-account-button')
        current.accountChoiceCount = await choices.count()
        current.accountDiagnostics = await choices.evaluateAll(async buttons => {
          let ariaLabelPresentCount = 0
          const matches = []
          for (const [index, button] of buttons.entries()) {
            const ariaLabel = button.getAttribute('aria-label')?.trim()
            if (ariaLabel) ariaLabelPresentCount++
            const label = (ariaLabel?.replace(/^Use this Account,\s*/i, '') ||
              button.closest('li')?.querySelector('span.text-lg')?.textContent || '').trim().replace(/\s+/g, ' ')
            const categories = ['strr', 'test', 'qa'].filter(pattern => new RegExp(pattern, 'i').test(label))
            if (!categories.length) continue
            const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(label.toLowerCase()))
            const labelSha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
            matches.push({ choiceIndex: index, categories, labelSha256, enabled: !button.disabled })
          }
          return { ariaLabelPresentCount, matchingChoiceCount: matches.length,
            matchingChoices: matches.slice(0, 50), omittedMatchingChoices: Math.max(0, matches.length - 50) }
        })
        throw new Error('Approved DEV synthetic account unavailable')
      }
      await accountButton.click()
      await page.waitForURL(url => url.origin === app.origin && !url.pathname.includes('/auth/'), { timeout: 45000 })
      await Promise.all(pending)
      current.dashboardRequests = []
      current.paymentRequests = []
      delete current.paymentAccount
      // Accept only requests started after account selection. A late response
      // from the previous/default account cannot satisfy the following checks.
      observeSelectedAccount = true
      current.authenticatedAccountSelected = true
      current.stage = 'dashboard'
      await page.goto(app.origin + app.dashboard, { waitUntil: 'domcontentloaded' })
      await page.getByTestId('h1').waitFor({ state: 'visible' })
      await expect.poll(() => item.dashboardRequests.some(r => r.status === 200), { timeout: 30000 }).toBe(true)
      current.dashboardLoaded = true
      current.stage = 'registration-form-and-fees'
      await page.goto(app.origin + app.form, { waitUntil: 'domcontentloaded' })
      await page.getByTestId('h1').waitFor({ state: 'visible' })
      await expect.poll(() => new Set(item.paymentRequests.filter(r => r.path.includes('/fees/STRR/') && r.status === 200).map(r => r.path)).size,
        { timeout: 30000 }).toBeGreaterThanOrEqual(app.feeCount)
      await expect.poll(() => Boolean(item.paymentAccount), { timeout: 30000 }).toBe(true)
      await Promise.all(pending)
      current.registrationFormLoaded = true
      if (mode === 'checkout') {
        expect(current.accountFixtureSource).toBe('existing-playwright-ci-account')
        expect(current.checkoutFixtureVerified).toBe(true)
        expect(current.paymentAccount.paymentMethod).toBe('DIRECT_PAY')
        if (app.name === 'host') await createHostPayment(page, current, card)
        if (app.name === 'platform') await preparePlatformCheckout(page, current, card)
        if (app.name === 'strata') await createStrataPayment(page, current, card)
        expect(current.receipt.result).toBe('passed')
      }
      expect(current.browserErrorCount).toBe(0)
      expect(current.consoleErrorCount).toBe(0)
      expect(current.failedAssetCount).toBe(0)
      current.deployedAfter = await captureBuild(context, app, expectedBuilds[app.name])
      expect(current.deployedAfter).toEqual(current.deployedBefore)
      current.result = 'passed'
      current.stage = 'complete'
    } catch (error) {
      current.error = { name: ['SyntaxError', 'TimeoutError'].includes(error.name) ? error.name : 'VerificationError', stage: current.stage }
      current.failureCallsite = error.stack?.split('\n').filter(line => /verification\/test-payments\/.*:\d+:\d+/.test(line)).map(line => line.slice(line.indexOf('verification/')))
      current.result = 'failed'
      if (page && !page.isClosed()) current.invalidFields = await page.locator('[aria-invalid="true"]').evaluateAll(elements =>
        elements.map(element => ({ id: element.id, name: element.getAttribute('name') }))).catch(() => [])
      process.exitCode = 1
    }
    if (page && !page.isClosed()) { current.finalUrl = safeUrl(page.url()); await page.close() }
  }
} catch (error) {
  report.error = { name: ['SyntaxError', 'TimeoutError'].includes(error.name) ? error.name : 'VerificationError', stage: current?.stage || 'setup' }
  process.exitCode = 1
} finally {
  await browser?.close()
  const sanitizeValues = value => typeof value === 'string' ? sanitize(value)
    : Array.isArray(value) ? value.map(sanitizeValues)
      : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeValues(item)])) : value
  const json = JSON.stringify(sanitizeValues(report), null, 2) + '\n'
  await writeFile('results/preflight.json', json)
  console.log(json)
}
