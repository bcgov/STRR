import { expect } from '@playwright/test'

export async function verifyHostAddressHelp(page, result) {
  const checks = result.addressHelp = {
    scope: 'Actual unsaved Host manual-address form: disclosure state, mouse/keyboard controls, focus return and optional unit validation. No application, document or payment writes.',
    cases: [], addressLookups: 0
  }
  const origin = new URL(page.url()).origin
  page.on('dialog', dialog => dialog.type() === 'beforeunload' ? dialog.accept() : dialog.dismiss())
  const observeRequest = request => {
    const url = new URL(request.url())
    if (url.hostname.startsWith('strr-api-') && url.pathname === '/address/requirements' && request.method() === 'POST') checks.addressLookups++
  }
  page.on('request', observeRequest)
  const help = page.getByTestId('address-help-toggle')
  const toggle = help.getByRole('button').first()
  const heading = help.getByRole('heading', { name: 'Street Address', exact: true })
  const hide = help.getByRole('button', { name: 'Hide', exact: true })
  const prepare = async () => {
    await page.goto(origin + '/en-CA/application', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Enter the residential address manually', exact: true }).click()
    await expect(help).toHaveCount(1)
    await expect(toggle).toBeVisible()
    await expect(help.getByText('Address', { exact: true })).toBeVisible()
    await expect(heading).not.toBeVisible()
  }
  const runCase = async (name, action) => {
    result.stage = 'address-help-' + name
    const test = { name, result: 'in_progress' }
    checks.cases.push(test)
    try {
      await prepare()
      await action()
      test.result = 'passed'
    } catch (error) {
      test.result = 'failed'
      test.error = { name: error.name }
      test.buttonExpanded = await toggle.count() ? await toggle.getAttribute('aria-expanded') : null
      test.buttonFocused = await toggle.count() ? await toggle.evaluate(element => element === document.activeElement) : false
    }
  }
  await runCase('native-button-expanded-state', async () => {
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(heading).toBeVisible()
  })
  await runCase('mouse-open-hide-reopen', async () => {
    await toggle.click()
    await expect(heading).toBeVisible()
    await hide.click()
    await expect(heading).not.toBeVisible()
    await toggle.click()
    await expect(heading).toBeVisible()
  })
  await runCase('hide-returns-button-focus', async () => {
    await toggle.click()
    await expect(heading).toBeVisible()
    await hide.click()
    await expect(heading).not.toBeVisible()
    await expect(toggle).toBeFocused()
  })
  await runCase('keyboard-enter-space', async () => {
    await toggle.focus()
    await toggle.press('Enter')
    await expect(heading).toBeVisible()
    await toggle.press('Space')
    await expect(heading).not.toBeVisible()
    await expect(toggle).toBeFocused()
  })
  for (const [unit, valid] of [['', true], ['A12', true], ['123ABC', true], ['123ABCD', false], ['A-12', false]]) {
    await runCase('unit-' + (unit || 'empty'), async () => {
      await page.getByTestId('rental-property-address-streetNumber').fill('5300')
      await page.getByTestId('rental-property-address-streetName').fill('44A Ave NW')
      await page.getByTestId('address.city').fill('Chetwynd')
      await page.getByTestId('address.postalCode').fill('V0C 1J0')
      const input = page.getByTestId('address.unitNumber')
      await input.fill(unit)
      const before = checks.addressLookups
      await page.getByRole('button', { name: 'Done', exact: true }).click()
      if (valid) {
        await expect(page.getByTestId('new-address-form')).not.toBeVisible({ timeout: 30000 })
        expect(checks.addressLookups - before).toBe(1)
        await expect.poll(() => result.addressLookupStatuses.length).toBe(checks.addressLookups)
        expect(result.addressLookupStatuses.at(-1)).toBe(200)
      } else {
        await expect(input).toHaveAttribute('aria-invalid', 'true')
        expect(checks.addressLookups - before).toBe(0)
      }
    })
  }
  page.off('request', observeRequest)
  result.stage = 'address-help-results'
  expect(checks.cases.filter(test => test.result !== 'passed').map(test => test.name)).toEqual([])
  checks.result = 'passed'
}
