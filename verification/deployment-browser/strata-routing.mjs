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
    await expect.poll(() => new URL(page.url()).pathname).toBe(application)
    await expect(page.getByTestId('stepper').getByRole('button')).toHaveCount(4)
    await expect(page.getByTestId('completing-party-radio-group')).toBeVisible()
  }
  const sameDocument = async () => expect(await page.evaluate(() => window.__strrQaRoutingMarker)).toBe('strata-route-check')

  result.stage = 'strata-router-dashboard-link'
  await expect.poll(() => new URL(page.url()).pathname).toBe(dashboard)
  await expect(page.getByRole('table')).toBeVisible()
  const link = page.getByRole('link', { name: 'Add a strata-titled hotel or motel', exact: true })
  await expect(link).toHaveAttribute('href', application)
  await page.evaluate(() => { window.__strrQaRoutingMarker = 'strata-route-check' })
  await link.click()
  await formReady()
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
