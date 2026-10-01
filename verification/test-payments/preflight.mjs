import { chromium, expect } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { createHash } from 'node:crypto'
import { loadTestCard, preparePlatformCheckout } from './platform-checkout.mjs'
import { createStrataPayment } from './strata-checkout.mjs'
import { createHostPayment } from './host-checkout.mjs'

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
].filter(app => !process.env.TEST_APP || app.name === process.env.TEST_APP)
const report = {
  checkedAt: new Date().toISOString(),
  scope: 'PR frontend assets served in the runner with live TEST public configuration, BCSC login, account, fees, fresh sandbox payments, receipts and persistence for the selected apps. No deployment or API mocking.',
  requestedApps: apps.map(app => app.name),
  sourceCommit: process.env.CANDIDATE_COMMIT,
  harnessCommit: process.env.GITHUB_SHA,
  runId: process.env.GITHUB_RUN_ID,
  credentialsConfigured: Boolean(username && password && account),
  apps: []
}
await mkdir('results', { recursive: true })
let browser
let page
let current
let card
try {
  if (!report.credentialsConfigured) throw new Error('Required BCSC test credentials are not configured')
  card = loadTestCard(secrets)
  report.sandboxCardFixtureUsable = true
  browser = await chromium.launch({ channel: 'chrome' })
  report.browserVersion = browser.version()
  const context = await browser.newContext({ serviceWorkers: 'block' })
  context.setDefaultTimeout(20000)
  context.setDefaultNavigationTimeout(60000)

  for (const app of apps) {
    current = { name: app.name, stage: 'candidate-setup', paymentRequests: [], browserErrors: [], result: 'in_progress' }
    report.apps.push(current)
    const appResult = current
    // Read public TEST configuration before routing candidate assets. All auth,
    // application and payment requests continue to their real TEST services.
    const seed = await browser.newPage({ serviceWorkers: 'block' })
    const liveResponse = await seed.goto(app.origin + '/en-CA/auth/login', { waitUntil: 'domcontentloaded' })
    await seed.waitForFunction(() => window.__NUXT__?.config?.public)
    const publicConfig = await seed.evaluate(() => window.__NUXT__.config.public)
    expect(new URL(publicConfig.payApiURL).hostname).toBe('pay-api-test-129641755850.northamerica-northeast1.run.app')
    expect(new URL(publicConfig.strrApiURL).hostname).toBe('strr-api-test-166050292631.northamerica-northeast1.run.app')
    expect(new URL(publicConfig.paymentPortalUrl).hostname).toBe('test.account.bcregistry.gov.bc.ca')
    expect(new URL(publicConfig.keycloakAuthUrl).hostname).toBe('test.loginproxy.gov.bc.ca')
    const liveHtml = await liveResponse.body()
    const entryPath = await seed.locator('script[type="module"][src]').first().getAttribute('src')
    const liveEntry = await context.request.get(new URL(entryPath, app.origin).href)
    expect(liveEntry.ok()).toBe(true)
    current.deployedTest = {
      htmlSha256: createHash('sha256').update(liveHtml).digest('hex'),
      entryPath, entrySha256: createHash('sha256').update(await liveEntry.body()).digest('hex'),
      publicConfigSha256: createHash('sha256').update(JSON.stringify(publicConfig)).digest('hex')
    }
    await seed.close()
    const appDirectory = { host: 'strr-host-pm-web', platform: 'strr-platform-web', strata: 'strr-strata-web' }[app.name]
    const assetRoot = resolve(process.env.CANDIDATE_ROOT, appDirectory, '.output/public')
    const candidateHtml = await readFile(resolve(assetRoot, '200.html'), 'utf8')
    expect(candidateHtml).toContain('window.__NUXT__.config')
    const html = candidateHtml.replace('</body>', '<script>window.__NUXT__.config.public=' +
      JSON.stringify(publicConfig).replace(/</g, '\\u003c') + '</script></body>')
    current.candidateAssets = { htmlSha256: createHash('sha256').update(candidateHtml).digest('hex'), documents: 0, served: {}, missing: [] }
    page = await context.newPage()
    // CDP handles each redirected request too; Playwright routes only the first
    // request in a redirect chain, which can otherwise load the deployed UI.
    const cdp = await context.newCDPSession(page)
    const mimeTypes = { '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json',
      '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
      '.woff': 'font/woff', '.woff2': 'font/woff2', '.webp': 'image/webp' }
    cdp.on('Fetch.requestPaused', async ({ requestId, request, resourceType }) => {
      const pathname = decodeURIComponent(new URL(request.url).pathname)
      let body
      let contentType
      let responseCode = 200
      if (resourceType === 'Document') {
        appResult.candidateAssets.documents++
        body = Buffer.from(html)
        contentType = 'text/html'
      } else {
        const filePath = resolve(assetRoot, '.' + pathname)
        try {
          if (!filePath.startsWith(assetRoot + sep)) throw new Error('Invalid asset path')
          body = await readFile(filePath)
          appResult.candidateAssets.served[pathname] = createHash('sha256').update(body).digest('hex')
          contentType = mimeTypes[extname(filePath)] || 'application/octet-stream'
        } catch {
          appResult.candidateAssets.missing.push(pathname)
          responseCode = 404
          body = Buffer.alloc(0)
          contentType = 'text/plain'
        }
      }
      await cdp.send('Fetch.fulfillRequest', { requestId, responseCode,
        responseHeaders: [{ name: 'content-type', value: contentType }, { name: 'cache-control', value: 'no-store' }],
        body: body.toString('base64') }).catch(() => {})
    })
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: app.origin + '/*', requestStage: 'Request' }] })
    current.stage = 'login'
    const pending = []
    page.on('pageerror', error => appResult.browserErrors.push({ name: error.name }))
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
    if (app === apps[0]) {
      await page.getByRole('button', { name: 'Log in with Test with username and password', exact: true }).click()
      if (new URL(page.url()).hostname !== 'idtest.gov.bc.ca') {
        throw new Error('Refusing to enter the TEST credentials on an unexpected identity provider')
      }
      await page.getByLabel('Email or username', { exact: true }).fill(username)
      await page.getByLabel('Password', { exact: true }).fill(password)
      await page.getByRole('button', { name: 'Continue', exact: true }).click()
    }
    await page.waitForURL(url => url.origin === app.origin && !url.pathname.endsWith('/auth/login'), { timeout: 45000 })
    current.stage = 'select-test-account'
    await page.goto(app.origin + '/en-CA/auth/account/choose-existing', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('choose-existing-account-button').first().waitFor({ state: 'visible' })
    const accountButton = page.getByRole('button', { name: 'Use this Account, ' + account, exact: true })
    current.testAccountAvailable = await accountButton.isEnabled()
    await accountButton.click()
    current.authenticatedAccountSelected = true
    current.stage = 'open-application'
    await page.goto(app.origin + app.form, { waitUntil: 'domcontentloaded' })
    await page.getByTestId('h1').waitFor({ state: 'visible' })
    expect(await page.evaluate(() => window.__NUXT__.config.public.baseUrl)).toBe(publicConfig.baseUrl)
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
    expect(current.paymentAccount.paymentMethod).toBe('DIRECT_PAY')
    expect(Object.keys(current.candidateAssets.served).some(path => /^\/_nuxt\/.*\.js$/.test(path))).toBe(true)
    expect(current.candidateAssets.missing).toHaveLength(0)
    try {
      if (app.name === 'host') await createHostPayment(page, current, card)
      if (app.name === 'platform') await preparePlatformCheckout(page, current, card)
      if (app.name === 'strata') await createStrataPayment(page, current, card)
      expect(current.browserErrors).toHaveLength(0)
      expect(current.candidateAssets.missing).toHaveLength(0)
      current.result = current.receipt?.result === 'failed' ? 'payment_passed_receipt_failed' : 'passed'
      current.stage = 'complete'
      if (current.result !== 'passed') process.exitCode = 1
    } catch (error) {
      current.paymentError = { name: error.name, stage: current.stage }
      current.failureCallsite = error.stack?.split('\n').filter(line => /verification\/test-payments\/.*:\d+:\d+/.test(line)).map(line => line.slice(line.indexOf('verification/')))
      current.result = 'failed'
      current.invalidFields = await page.locator('[aria-invalid="true"]').evaluateAll(elements =>
        elements.map(element => ({ id: element.id, name: element.getAttribute('name') }))
      ).catch(() => [])
      process.exitCode = 1
    }
    current.finalUrl = safeUrl(page.url())
    await page.close()
  }
} catch (error) {
  report.error = { name: error.name, stage: current?.stage || 'setup' }
  report.failureCallsite = error.stack?.split('\n').filter(line => /verification\/test-payments\/.*:\d+:\d+/.test(line)).map(line => line.slice(line.indexOf('verification/')))
  if (current) current.result = 'failed'
  if (page && !page.isClosed() && current) current.finalUrl = safeUrl(page.url())
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
