import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { verifyPlatformFeeGuard, verifyPlatformFeeOptions } from './platform-fee-guard.mjs'
import { verifyStrataFeeGuard } from './strata-fee-guard.mjs'
import { verifyStrataCheckout } from './strata-checkout.mjs'

const environment = process.env.VERIFY_ENVIRONMENT
if (!['dev', 'test'].includes(environment)) throw new Error('Only DEV and TEST are allowed')
const scenario = process.env.VERIFY_SCENARIO
if (!['renewal-inventory', 'platform-fee-guard', 'platform-fee-options', 'strata-fee-guard', 'strata-checkout', 'host-renewal-fees'].includes(scenario)) throw new Error('Unknown scenario')
if (scenario === 'strata-checkout' && environment !== 'test') throw new Error('Sandbox checkout is TEST only')
const scenarioApp = { 'platform-fee-guard': 'platform', 'platform-fee-options': 'platform', 'strata-fee-guard': 'stratahotel', 'strata-checkout': 'stratahotel', 'host-renewal-fees': 'host' }[scenario]
const report = {
  checkedAt: new Date().toISOString(), environment, scenario,
  harnessCommit: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID,
  scope: scenario === 'strata-checkout'
    ? 'One fresh synthetic TEST Strata application: missing-fee guard, optional draft save, recovery and sandbox card payment/receipt. Unrelated application writes blocked.'
    : 'Synthetic-account prerequisite/fee reads and optional browser-only fee guard controls. Application writes/payments are blocked; normal login sync is allowed.',
  apps: [], result: 'in_progress'
}
await mkdir('results', { recursive: true })
const browser = await chromium.launch()
try {
  for (const app of [
    { name: 'host', type: 'HOST', dashboard: '/dashboard', application: '/application', renewalCodes: ['HOSTREN_ON', 'HOSTRENOFF', 'HOSTREN_BB'] },
    { name: 'platform', type: 'PLATFORM', dashboard: '/platform/dashboard', application: '/platform/application?override=true', renewalCodes: ['PLATRENEWM', 'PLATRENEWL', 'PLATRENEWV'] },
    { name: 'stratahotel', type: 'STRATA_HOTEL', dashboard: '/strata-hotel/dashboard', application: '/strata-hotel/application', renewalCodes: ['STRATRENEW'] }
  ].filter(app => !scenarioApp || app.name === scenarioApp)) {
    const result = { app: app.name, stage: 'login', result: 'in_progress', browserErrors: 0, blockedWrites: 0, blockedRequestCategories: [], loginSyncRequests: 0, addressLookupStatuses: [], fees: [] }
    report.apps.push(result)
    const origin = `https://${environment}.${app.name}.shorttermrental.registry.gov.bc.ca`
    const context = await browser.newContext()
    context.setDefaultTimeout(20000)
    context.setDefaultNavigationTimeout(60000)
    const page = await context.newPage()
    let apiOrigin
    let apiHeaders
    let payOrigin
    let payHeaders
    const pending = []
    page.on('pageerror', () => result.browserErrors++)
    await page.route('**/*', async route => {
      const request = route.request()
      const url = new URL(request.url())
      const strrApi = url.hostname.startsWith(`strr-api-${environment}-`)
      const payApi = url.hostname.startsWith(`pay-api-${environment}-`)
      // useTosStore.getTermsOfUse() requires this login sync before account selection.
      const loginSync = strrApi && url.pathname === '/users' && request.method() === 'POST'
      // The address endpoint calculates requirements without saving an application.
      const addressLookup = scenario === 'host-renewal-fees' && strrApi && url.pathname === '/address/requirements' && request.method() === 'POST'
      if (loginSync) result.loginSyncRequests++
      if ((strrApi || payApi) && !loginSync && !addressLookup && !['GET', 'OPTIONS'].includes(request.method())) {
        result.blockedWrites++
        result.blockedRequestCategories.push({ method: request.method(), resource: /^\/(applications|registrations|documents|address)(?:\/|$)/.exec(url.pathname)?.[1] || 'other' })
        await route.abort('blockedbyclient')
      } else await route.continue()
    })
    page.on('response', response => {
      const url = new URL(response.url())
      if (url.hostname.startsWith(`strr-api-${environment}-`) && url.pathname === '/address/requirements') result.addressLookupStatuses.push(response.status())
      if (url.hostname.startsWith(`pay-api-${environment}-`) && url.pathname.startsWith('/api/v1/fees/STRR/')) {
        const fee = { code: url.pathname.split('/').at(-1), status: response.status() }
        result.fees.push(fee)
        pending.push(response.request().allHeaders().then(headers => {
          payOrigin = url.origin
          payHeaders = { authorization: headers.authorization, 'account-id': headers['account-id'] }
        }))
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
      const [listResponse] = await Promise.all([
        page.waitForResponse(response => {
          const url = new URL(response.url())
          return url.hostname.startsWith(`strr-api-${environment}-`) &&
            ['/applications', '/registrations', '/registrations/user/search'].includes(url.pathname) &&
            response.request().method() === 'GET' && response.ok()
        }, { timeout: 30000 }),
        page.goto(origin + '/en-CA' + app.dashboard, { waitUntil: 'domcontentloaded' })
      ])
      // Use the selected dashboard's exact request, never a startup/default-account request.
      const listHeaders = await listResponse.request().allHeaders()
      expect(Boolean(listHeaders.authorization && listHeaders['account-id'])).toBe(true)
      apiOrigin = new URL(listResponse.url()).origin
      apiHeaders = { authorization: listHeaders.authorization, 'account-id': listHeaders['account-id'] }

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
        headers: apiHeaders, params: { registration_type: app.type, limit: '100', offset: '1' }
      })
      result.registrationListStatus = registrationsResponse.status()
      expect(registrationsResponse.status()).toBe(200)
      const registrations = await registrationsResponse.json()
      result.registrationTotal = registrations.total
      expect(registrations.registrations.length).toBe(registrations.total)
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
      result.stage = 'live-renewal-fee-availability'
      result.renewalFees = []
      for (const code of app.renewalCodes) {
        const response = await page.request.get(payOrigin + '/api/v1/fees/STRR/' + code, { headers: payHeaders })
        const fee = { code, status: response.status(), source: 'direct-read-only-api-not-ui-selection' }
        result.renewalFees.push(fee)
        expect(response.status()).toBe(200)
        const body = await response.json()
        fee.filingFees = body.filingFees
        fee.serviceFees = body.serviceFees
        fee.total = body.total
      }
      if (scenario === 'platform-fee-guard') await verifyPlatformFeeGuard(page, result, environment)
      if (scenario === 'platform-fee-options') await verifyPlatformFeeOptions(page, result, environment)
      if (scenario === 'strata-fee-guard') await verifyStrataFeeGuard(page, result, environment)
      if (scenario === 'strata-checkout') await verifyStrataCheckout(page, result, environment, apiHeaders['account-id'])
      if (scenario === 'host-renewal-fees') {
        result.stage = 'host-renewal-prerequisite'
        const eligible = result.registrations.find(registration => registration.tasks.includes('REGISTRATION_RENEWAL'))
        expect(Boolean(eligible)).toBe(true)
        const registration = registrations.registrations.find(item => item.id === eligible.id)
        expect(Boolean(registration.registrationNumber)).toBe(true)
        result.renewalFlow = { registrationId: eligible.id, scope: 'Open existing eligible renewal, verify live fee selection; no save, invoice or payment.' }
        result.stage = 'host-renewal-navigation'
        await page.goto(origin + '/en-CA/dashboard/registration/' + encodeURIComponent(registration.registrationNumber), { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('button', { name: 'Renew', exact: true })).toBeVisible()
        const previousFeeCount = result.fees.length
        await page.getByRole('button', { name: 'Renew', exact: true }).click()
        await page.waitForURL(url => url.pathname.endsWith('/application') && url.searchParams.get('renew') === 'true')
        result.stage = 'host-renewal-fee-selection'
        await expect.poll(() => result.fees.length - previousFeeCount, { timeout: 30000 }).toBeGreaterThanOrEqual(3)
        await Promise.all(pending)
        const renewalUiFees = result.fees.slice(previousFeeCount)
        result.renewalFlow.uiFees = renewalUiFees
        expect(renewalUiFees.map(fee => fee.code).sort()).toEqual([...app.renewalCodes].sort())
        expect(renewalUiFees.every(fee => fee.status === 200)).toBe(true)
        await expect(page.getByText('STR Renewal Fee', { exact: true })).toBeVisible()
        await expect(page.getByTestId('h1')).toHaveText('Short-Term Rental Registration Renewal')
        result.renewalFlow.result = 'passed'
      }
      expect(result.blockedWrites).toBe(0)
      expect(result.addressLookupStatuses.every(status => status === 200)).toBe(true)
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
