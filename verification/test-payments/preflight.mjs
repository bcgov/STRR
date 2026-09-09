import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

// These existing CI credentials stay inside the runner. No traces, cookies,
// storage state, response bodies, or credentials are uploaded.
const username = process.env.PLAYWRIGHT_TEST_BCSC_USERNAME
const password = process.env.PLAYWRIGHT_TEST_BCSC_PASSWORD
const rawAccount = process.env.PLAYWRIGHT_TEST_BCSC_PREMIUM_ACCOUNT_NAME
const account = rawAccount?.trim()
const secrets = [username, password, rawAccount, account].filter(Boolean)
const sanitize = value => {
  let text = String(value)
  for (const secret of secrets) text = text.split(secret).join('[redacted]')
  return text
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[redacted-email]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted-token]')
    .replace(/(https?:\/\/[^\s"'<>?#]+)[?#][^\s"'<>]*/g, '$1?[redacted-query]')
}
const safeUrl = value => {
  const url = new URL(value)
  return url.origin + url.pathname
}
const apps = [
  { name: 'host', origin: 'https://test.host.shorttermrental.registry.gov.bc.ca', form: '/en-CA/application', feeCount: 3 },
  { name: 'platform', origin: 'https://test.platform.shorttermrental.registry.gov.bc.ca', form: '/en-CA/platform/application?override=true', feeCount: 3 },
  { name: 'strata', origin: 'https://test.stratahotel.shorttermrental.registry.gov.bc.ca', form: '/en-CA/strata-hotel/application', feeCount: 1 }
]
const report = {
  checkedAt: new Date().toISOString(),
  scope: 'Deployed TEST login, Premium account selection and fee loading only. No application submission or payment.',
  credentialsConfigured: Boolean(username && password && account),
  apps: []
}
await mkdir('results', { recursive: true })
let browser
let page
let current
try {
  if (!report.credentialsConfigured) throw new Error('Required BCSC test credentials or Premium account are not configured')
  browser = await chromium.launch()
  const context = await browser.newContext()
  context.setDefaultTimeout(20000)
  context.setDefaultNavigationTimeout(60000)

  for (const app of apps) {
    current = { name: app.name, stage: 'login', paymentRequests: [], browserErrors: [], result: 'in_progress' }
    report.apps.push(current)
    const appResult = current
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
    await page.getByRole('button', { name: 'Continue with BC Services Card', exact: true }).click()
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
    current.stage = 'select-premium-account'
    await page.goto(app.origin + '/en-CA/auth/account/choose-existing', { waitUntil: 'domcontentloaded' })
    await page.getByTestId('choose-existing-account-button').first().waitFor({ state: 'visible' })
    current.availableAccounts = await page.getByTestId('choose-existing-account-button').evaluateAll(buttons =>
      buttons.map(button => ({ label: button.getAttribute('aria-label'), disabled: button.disabled }))
    )
    current.availableAccounts = current.availableAccounts.map(option => ({ ...option, label: sanitize(option.label) }))
    await page.getByRole('button', { name: 'Use this Account, ' + account, exact: true }).click()
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
    current.finalUrl = safeUrl(page.url())
    current.result = 'passed'
    current.stage = 'complete'
    await page.close()
  }
} catch (error) {
  report.error = sanitize(error.message)
  if (current) current.result = 'failed'
  if (page && !page.isClosed()) {
    if (current) current.finalUrl = safeUrl(page.url())
    report.visibleState = {
      title: sanitize(await page.title().catch(() => '')),
      headings: (await page.locator('h1,h2').allTextContents().catch(() => [])).map(sanitize),
      alerts: (await page.getByRole('alert').allTextContents().catch(() => [])).map(sanitize),
      buttons: (await page.getByRole('button').allTextContents().catch(() => [])).map(sanitize)
    }
  }
  process.exitCode = 1
} finally {
  await browser?.close()
  await writeFile('results/preflight.json', JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
}
