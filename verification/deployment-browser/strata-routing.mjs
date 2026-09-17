import { expect } from '@playwright/test'

export async function verifyStrataRouting(page, result) {
  const origin = new URL(page.url()).origin
  if (!/^https:\/\/(dev|test)\.stratahotel\.shorttermrental\.registry\.gov\.bc\.ca$/.test(origin)) {
    throw new Error('Only Strata DEV/TEST routing is allowed')
  }
  const dashboard = '/en-CA/strata-hotel/dashboard'
  const application = '/en-CA/strata-hotel/application'
  const checks = result.routing = {
    scope: 'Real dashboard link, same-document routing, browser Back/Forward and direct reload. No form edits, save, submission or payment.',
    cases: []
  }
  const completed = name => checks.cases.push({ name, result: 'passed' })
  const formReady = async () => {
    const boundary = result.stage
    result.stage = boundary + '-path'
    try {
      await expect.poll(() => new URL(page.url()).pathname).toBe(application)
      result.stage = boundary + '-steps'
      await expect(page.getByTestId('stepper').getByRole('button')).toHaveCount(4)
      result.stage = boundary + '-contact'
      await expect(page.getByTestId('completing-party-radio-group')).toBeVisible()
    } catch (error) {
      const snapshot = async () => ({
        onDashboard: new URL(page.url()).pathname === dashboard,
        onApplication: new URL(page.url()).pathname === application,
        onAuthRoute: new URL(page.url()).pathname.includes('/auth/'),
        stepCount: await page.getByTestId('stepper').getByRole('button').count(),
        contactVisible: await page.getByTestId('completing-party-radio-group').isVisible(),
        documentPreserved: await page.evaluate(() => window.__strrQaRoutingMarker === 'strata-route-check'),
        documentReady: await page.evaluate(() => document.readyState === 'complete')
      })
      checks.navigationFailure = { boundary: result.stage, immediate: await snapshot() }
      // Observe late navigation after the original assertion fails; never turn it into a pass or click again.
      checks.navigationFailure.arrivedWithinAdditional30Seconds = await page.waitForURL(
        url => url.origin === origin && url.pathname === application, { timeout: 30000 }
      ).then(() => true, () => false)
      checks.navigationFailure.later = await snapshot()
      // Record late form readiness too, but preserve the original failed assertion.
      if (result.stage !== boundary + '-path') {
        checks.navigationFailure.contactVisibleWithinAdditional30Seconds = await page
          .getByTestId('completing-party-radio-group').waitFor({ state: 'visible', timeout: 30000 })
          .then(() => true, () => false)
        checks.navigationFailure.afterContactObservation = await snapshot()
      }
      throw error
    }
  }
  const sameDocument = async () => expect(await page.evaluate(() => window.__strrQaRoutingMarker)).toBe('strata-route-check')

  result.stage = 'strata-router-dashboard-path'
  checks.dashboard = {
    expectedPath: new URL(page.url()).pathname === dashboard,
    unprefixedPath: new URL(page.url()).pathname === '/strata-hotel/dashboard'
  }
  await expect.poll(() => new URL(page.url()).pathname).toBe(dashboard)
  result.stage = 'strata-router-dashboard-table'
  await expect(page.getByRole('table')).toBeVisible()
  const link = page.getByRole('link', { name: 'Add a strata-titled hotel or motel', exact: true })
  result.stage = 'strata-router-dashboard-link-target'
  checks.dashboard.labelledLinkCount = await link.count()
  checks.dashboard.applicationLinkCount = await page.locator('a').evaluateAll(anchors => anchors.filter(anchor => {
    try { return new URL(anchor.href).pathname.endsWith('/strata-hotel/application') } catch { return false }
  }).length)
  if (await link.count() === 1) {
    const href = await link.getAttribute('href')
    checks.dashboard.relativeHrefMatches = href === application
    checks.dashboard.targetPathMatches = new URL(href, origin).pathname === application
    checks.dashboard.targetIsAbsolute = /^https?:/.test(href)
  }
  await expect(link).toHaveAttribute('href', application)
  await page.evaluate(() => { window.__strrQaRoutingMarker = 'strata-route-check' })
  result.stage = 'strata-router-dashboard-link-click'
  await link.click()
  result.stage = 'strata-router-first-form-ready'
  await formReady()
  result.stage = 'strata-router-first-same-document'
  await sameDocument()
  completed('dashboard-link-uses-client-router')

  result.stage = 'strata-router-browser-back'
  await page.goBack()
  await expect.poll(() => new URL(page.url()).pathname).toBe(dashboard)
  await expect(page.getByRole('table')).toBeVisible()
  await sameDocument()
  completed('browser-back-restores-dashboard')

  result.stage = 'strata-router-browser-forward'
  await page.goForward()
  await formReady()
  await sameDocument()
  completed('browser-forward-restores-application')

  result.stage = 'strata-router-direct-reload'
  await page.reload({ waitUntil: 'domcontentloaded' })
  await formReady()
  expect(await page.evaluate(() => window.__strrQaRoutingMarker)).toBeUndefined()
  completed('direct-application-reload-keeps-authenticated-route')
  await page.goto(origin + dashboard, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('table')).toBeVisible()
  checks.result = 'passed'
}
