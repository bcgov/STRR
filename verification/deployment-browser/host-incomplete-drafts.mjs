import { expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

// Only delete a fresh fixture created by this invocation, unchanged and unpaid.
export function assertOwnedDraft(body, number, registration) {
  expect(String(body.header.applicationNumber)).toBe(number)
  expect(body.header.status).toBe('DRAFT')
  expect(body.header.paymentToken == null).toBe(true)
  expect(body.header.registrationId == null).toBe(true)
  expect(body.registration).toEqual(registration)
}

export async function verifyIncompleteHostDrafts(page, result, environment, apiOrigin, apiHeaders) {
  expect(['dev', 'test']).toContain(environment)
  expect(new URL(apiOrigin).hostname.startsWith(`strr-api-${environment}-`)).toBe(true)
  const origin = `https://${environment}.host.shorttermrental.registry.gov.bc.ca`
  expect(new URL(page.url()).pathname).toBe('/en-CA/dashboard-new')
  await expect(page.getByTestId('applications-table').getByRole('textbox')).toBeVisible()
  const runId = process.env.GITHUB_RUN_ID
  if (!/^\d+$/.test(runId || '')) throw new Error('Run identity required before fixture creation')
  const verification = result.incompleteDrafts = {
    scope: 'Fresh synthetic DRAFT-only API fixtures, real dashboard search/resume and unsaved edits. Exact unchanged unpaid fixtures deleted afterward. No invoice, submission or payment.',
    cases: []
  }
  const checkpoint = () => writeFile('results/host-incomplete-drafts-checkpoint.json', JSON.stringify({
    environment, runId, harnessCommit: process.env.GITHUB_SHA, ...verification
  }, null, 2) + '\n')
  page.on('dialog', dialog => dialog.type() === 'beforeunload' ? dialog.accept() : dialog.dismiss())
  const cases = [
    { name: 'omitted-property', fields: {}, street: '', city: '' },
    { name: 'empty-property', fields: { unitAddress: {}, unitDetails: {} }, street: '', city: '' },
    { name: 'partial-address', fields: { unitAddress: { city: 'Victoria' } }, street: '', city: 'Victoria' },
    { name: 'complete-address-control', fields: {
      unitAddress: { streetNumber: '5300', streetName: '44A Ave NW', city: 'Chetwynd', province: 'BC',
        country: 'CA', postalCode: 'V0C 1J0', nickname: `Draft Resume QA ${runId}` },
      unitDetails: {}
    }, street: '5300 44A Ave NW', city: 'Chetwynd' }
  ]
  for (const fixture of cases) {
    const registration = { registrationType: 'HOST', ...fixture.fields }
    const record = { name: fixture.name, creationAttempted: true, checks: [], deleted: false }
    verification.cases.push(record)
    await checkpoint()
    result.stage = 'draft-create-' + fixture.name
    // APIRequestContext is deliberately used only here and for guarded cleanup;
    // the browser's global guard continues blocking every form/checkout write.
    const created = await page.request.post(apiOrigin + '/applications', {
      headers: { ...apiHeaders, isDraft: 'true' }, data: { registration }
    })
    record.createStatus = created.status()
    expect(created.status()).toBe(200)
    const body = await created.json()
    const number = String(body.header?.applicationNumber)
    expect(number).toMatch(/^\d{14}$/)
    record.applicationNumber = number
    await checkpoint()
    const endpoint = apiOrigin + '/applications/' + number
    try {
      assertOwnedDraft(body, number, registration)
      const detail = await page.request.get(endpoint, { headers: apiHeaders })
      expect(detail.status()).toBe(200)
      assertOwnedDraft(await detail.json(), number, registration)
      for (const path of ['/applications', '/applications/user/search']) {
        const response = await page.request.get(apiOrigin + path, {
          headers: apiHeaders, params: { registrationType: 'HOST', recordNumber: number, status: 'DRAFT',
            includeDraftRegistration: 'true', page: '1', limit: '100' }
        })
        expect(response.status()).toBe(200)
        const rows = (await response.json()).applications.filter(item => String(item.header.applicationNumber) === number)
        expect(rows).toHaveLength(1)
        assertOwnedDraft(rows[0], number, registration)
      }
      record.apiRoundTrip = true

      result.stage = 'draft-dashboard-' + fixture.name
      try {
        await page.goto(origin + '/en-CA/dashboard-new', { waitUntil: 'domcontentloaded' })
        const table = page.getByTestId('applications-table')
        await table.getByRole('textbox').fill(number)
        const row = table.locator('tbody tr').filter({ hasText: number })
        await expect(row).toHaveCount(1, { timeout: 15000 })
        const address = row.locator('td').nth(2)
        await expect(address).not.toContainText(/undefined|null/)
        await expect(address).toContainText(fixture.street || 'N/A')
        if (fixture.city) await expect(address).toContainText(fixture.city)
        await row.getByRole('button', { name: 'Resume Draft', exact: true }).click()
        await page.waitForURL(url => url.origin === origin && url.pathname === '/en-CA/application' &&
          url.searchParams.get('applicationId') === number)
        record.checks.push({ name: 'dashboard-display-and-resume', passed: true })
      } catch (error) {
        record.checks.push({ name: 'dashboard-display-and-resume', passed: false,
          error: error.name === 'TimeoutError' ? 'TimeoutError' : 'AssertionError' })
      }

      // Exercise the actual resume route independently if the table failed.
      result.stage = 'draft-form-' + fixture.name
      try {
        if (new URL(page.url()).pathname !== '/en-CA/application' || new URL(page.url()).searchParams.get('applicationId') !== number) {
          await page.goto(origin + '/en-CA/application?applicationId=' + number, { waitUntil: 'domcontentloaded' })
        }
        const nickname = page.getByTestId('rental-unit-address-nickname')
        await expect(nickname).toBeVisible({ timeout: 20000 })
        await expect(nickname).toHaveValue(fixture.fields.unitAddress?.nickname || '')
        await expect(page.locator('#rental-property-address-lookup-street')).toHaveValue(fixture.street)
        const unsavedName = `Unsaved Draft QA ${runId} ${fixture.name}`
        await nickname.fill(unsavedName)
        await nickname.press('Tab')
        await expect(nickname).toHaveValue(unsavedName)
        await page.getByRole('button', { name: 'Enter the residential address manually', exact: true }).click()
        await page.getByTestId('rental-property-address-streetNumber').fill('5300')
        await page.getByTestId('rental-property-address-streetName').fill('44A Ave NW')
        await page.getByTestId('address.city').fill('Chetwynd')
        await expect(page.getByTestId('rental-property-address-streetNumber')).toHaveValue('5300')
        await expect(page.getByTestId('address.city')).toHaveValue('Chetwynd')
        await page.reload({ waitUntil: 'domcontentloaded' })
        await expect(nickname).toHaveValue(fixture.fields.unitAddress?.nickname || '', { timeout: 20000 })
        await expect(page.locator('#rental-property-address-lookup-street')).toHaveValue(fixture.street)
        record.checks.push({ name: 'resume-edit-and-reload-original', passed: true })
      } catch (error) {
        record.checks.push({ name: 'resume-edit-and-reload-original', passed: false,
          error: error.name === 'TimeoutError' ? 'TimeoutError' : 'AssertionError' })
      }
    } finally {
      result.stage = 'draft-cleanup-' + fixture.name
      await checkpoint()
      const current = await page.request.get(endpoint, { headers: apiHeaders })
      expect(current.status()).toBe(200)
      assertOwnedDraft(await current.json(), number, registration)
      const deleted = await page.request.delete(endpoint, { headers: apiHeaders })
      record.deleteStatus = deleted.status()
      expect(deleted.status()).toBe(204)
      const absent = await page.request.get(endpoint, { headers: apiHeaders })
      record.afterDeleteStatus = absent.status()
      expect(absent.status()).toBe(404)
      record.deleted = true
      await checkpoint()
    }
  }
  result.stage = 'draft-verification-results'
  expect(verification.cases.every(item => item.apiRoundTrip && item.deleted && item.checks.length === 2 &&
    item.checks.every(check => check.passed))).toBe(true)
  verification.result = 'passed'
}
