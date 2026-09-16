import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const environment = process.env.VERIFY_ENVIRONMENT
if (!['dev', 'test'].includes(environment)) throw new Error('Only DEV and TEST are allowed')
const report = {
  checkedAt: new Date().toISOString(), environment, scenario: 'renewal-inventory',
  harnessCommit: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID,
  scope: 'Read-only synthetic-account renewal prerequisites and live registration fees. No application writes or payments.',
  apps: [], result: 'in_progress'
}
await mkdir('results', { recursive: true })
const browser = await chromium.launch()
try {
  for (const app of [
    { name: 'host', type: 'HOST', dashboard: '/dashboard', application: '/application' },
    { name: 'platform', type: 'PLATFORM', dashboard: '/platform/dashboard', application: '/platform/application' },
    { name: 'stratahotel', type: 'STRATA_HOTEL', dashboard: '/strata-hotel/dashboard', application: '/strata-hotel/application' }
  ]) {
    const result = { app: app.name, stage: 'login', result: 'in_progress', browserErrors: 0, blockedWrites: 0, fees: [] }
    report.apps.push(result)
    const origin = `https://${environment}.${app.name}.shorttermrental.registry.gov.bc.ca`
    const context = await browser.newContext()
    context.setDefaultTimeout(20000)
    context.setDefaultNavigationTimeout(60000)
    const page = await context.newPage()
    let apiOrigin
    let apiHeaders
    const pending = []
    page.on('pageerror', () => result.browserErrors++)
    await page.route('**/*', async route => {
      const request = route.request()
      const url = new URL(request.url())
      if (url.hostname.startsWith(`strr-api-${environment}-`) && !['GET', 'OPTIONS'].includes(request.method())) {
        result.blockedWrites++
        await route.abort('blockedbyclient')
      } else await route.continue()
    })
    page.on('response', response => {
      const url = new URL(response.url())
      if (url.hostname.startsWith(`strr-api-${environment}-`) && response.ok() && response.request().method() === 'GET') {
        pending.push(response.request().allHeaders().then(headers => {
          if (headers.authorization && headers['account-id']) {
            apiOrigin = url.origin
            apiHeaders = { authorization: headers.authorization, 'account-id': headers['account-id'] }
          }
        }))
      }
      if (url.hostname.startsWith(`pay-api-${environment}-`) && url.pathname.startsWith('/api/v1/fees/STRR/')) {
        const fee = { code: url.pathname.split('/').at(-1), status: response.status() }
        result.fees.push(fee)
        if (response.ok()) pending.push(response.json().then(body => {
          fee.filingFees = body.filingFees
          fee.serviceFees = body.serviceFees
          fee.total = body.total
        }))
      }
    })
    try {
      const username = process.env.PLAYWRIGHT_TEST_BCSC_USERNAME
      const password = process.env.PLAYWRIGHT_TEST_BCSC_PASSWORD
      if (!username || !password) throw new Error('Runner credentials unavailable')
      await page.goto(origin + '/en-CA/auth/login', { waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: 'Continue with BC Services Card', exact: true }).click()
      await page.getByRole('button', { name: 'Log in with Test with username and password', exact: true }).click()
      if (new URL(page.url()).hostname !== 'idtest.gov.bc.ca') throw new Error('Unexpected credential destination')
      await page.getByLabel('Email or username', { exact: true }).fill(username)
      await page.getByLabel('Password', { exact: true }).fill(password)
      await page.getByRole('button', { name: 'Continue', exact: true }).click()
      await page.waitForURL(url => url.origin === origin && !url.pathname.endsWith('/auth/login'), { timeout: 45000 })
      result.authenticated = true
      result.stage = 'select-synthetic-account'
      await page.goto(origin + '/en-CA/auth/account/choose-existing', { waitUntil: 'domcontentloaded' })
      await page.getByTestId('choose-existing-account-button').first().waitFor({ state: 'visible' })
      const account = page.getByRole('button', { name: 'Use this Account, STRR_TEST_29', exact: true })
      result.accountAvailable = await account.count() === 1 && await account.isEnabled()
      if (!result.accountAvailable) throw new Error('Known synthetic account unavailable')
      await account.click()
      await page.waitForURL(url => url.origin === origin && !url.pathname.includes('/auth/'), { timeout: 45000 })
      result.stage = 'dashboard'
      await page.goto(origin + '/en-CA' + app.dashboard, { waitUntil: 'domcontentloaded' })
      await expect.poll(() => Boolean(apiOrigin && apiHeaders), { timeout: 30000 }).toBe(true)
      await Promise.all(pending)

      result.stage = 'renewal-prerequisites'
      const applicationsResponse = await page.request.get(apiOrigin + '/applications', {
        headers: apiHeaders, params: { registrationType: app.type, limit: '100', page: '1', includeDraftRenewal: 'true' }
      })
      expect(applicationsResponse.status()).toBe(200)
      const applications = await applicationsResponse.json()
      result.applicationTotal = applications.total
      result.renewalApplications = applications.applications.filter(item => item.header.applicationType === 'renewal').map(item => ({
        number: item.header.applicationNumber, status: item.header.status,
        paymentStatus: item.header.paymentStatus, registrationId: item.header.registrationId
      }))
      const registrationsResponse = await page.request.get(apiOrigin + '/registrations', {
        headers: apiHeaders, params: { registration_type: app.type, limit: '100', offset: '0' }
      })
      expect(registrationsResponse.status()).toBe(200)
      const registrations = await registrationsResponse.json()
      result.registrationTotal = registrations.total
      result.registrations = []
      for (const registration of registrations.registrations) {
        const response = await page.request.get(apiOrigin + `/registrations/${registration.id}/todos`, { headers: apiHeaders })
        expect(response.status()).toBe(200)
        const body = await response.json()
        result.registrations.push({
          id: registration.id, status: registration.status, expiryDate: registration.expiryDate,
          tasks: body.todos.map(item => item.task.type)
        })
      }
      result.stage = 'live-registration-fees'
      await page.goto(origin + '/en-CA' + app.application, { waitUntil: 'domcontentloaded' })
      await expect.poll(() => result.fees.filter(fee => fee.status === 200).length, { timeout: 30000 }).toBeGreaterThanOrEqual(app.name === 'stratahotel' ? 1 : 3)
      await Promise.all(pending)
      expect(result.blockedWrites).toBe(0)
      expect(result.browserErrors).toBe(0)
      result.stage = 'complete'
      result.result = 'passed'
    } catch (error) {
      result.result = 'failed'
      result.error = { name: error.name, stage: result.stage }
      process.exitCode = 1
    } finally {
      await context.close()
      await writeFile('results/renewal-inventory.json', JSON.stringify(report, null, 2) + '\n')
    }
  }
  report.result = report.apps.every(app => app.result === 'passed') ? 'passed' : 'failed'
} finally {
  await browser.close()
  const json = JSON.stringify(report, null, 2)
  await writeFile('results/renewal-inventory.json', json + '\n')
  console.log(json)
}
