import { expect } from '@playwright/test'

export async function verifyFormControls(page, result, app) {
  const checks = result.formControls = {
    scope: 'Unsaved actual forms, country selection/remount and four-step navigation. No application, document or payment writes. Dynamic step-array edge cases remain component tests.',
    cases: []
  }
  const applicationUrl = new URL('/en-CA' + app.application, page.url()).href
  page.on('dialog', dialog => dialog.type() === 'beforeunload' ? dialog.accept() : dialog.dismiss())
  const steps = page.getByTestId('stepper').getByRole('button')
  const input = page.getByTestId('phone-countryCode')
  const phoneStep = app.name === 'host' ? 1 : 0
  const prepare = async () => {
    checks.action = 'fresh-form'
    await page.goto(applicationUrl, { waitUntil: 'domcontentloaded' })
    await expect(steps).toHaveCount(4)
    await expect(steps.nth(0)).toHaveAttribute('aria-current', 'step')
    if (app.name === 'host') {
      await steps.nth(1).click()
      await page.getByTestId('add-person-owner-btn').click()
      await page.getByTestId('host-owner').locator('input[type="radio"][value="HOST"]').check()
    } else {
      await page.getByTestId('completing-party-radio-group').getByRole('radio', { name: 'Yes', exact: true }).check()
    }
    await expect(input).toHaveCount(1)
    await expect(input).toBeVisible()
    checks.action = 'form-prepared'
  }
  const remount = async () => {
    checks.action = 'leave-phone-step'
    const otherStep = phoneStep === 0 ? 1 : 0
    await steps.nth(otherStep).click()
    await expect(steps.nth(otherStep)).toHaveAttribute('aria-current', 'step')
    await expect(input).toHaveCount(0)
    checks.action = 'return-phone-step'
    await steps.nth(phoneStep).click()
    await expect(steps.nth(phoneStep)).toHaveAttribute('aria-current', 'step')
    await expect(input).toBeVisible()
  }
  const selectCanada = async () => {
    checks.action = 'select-canada-control'
    await input.fill('1')
    await input.press('ArrowDown')
    // Installed Nuxt UI InputMenu debounces custom search by 200ms. Do not
    // click a stale option from the previous query before that search settles.
    await page.waitForTimeout(500)
    await page.getByRole('option', { name: /\+1\s*Canada$/ }).click()
    await expect(input).toHaveValue('+1')
  }
  const runCase = async (name, action) => {
    result.stage = 'form-controls-' + name
    const beforeErrors = result.browserErrors
    const test = { name, result: 'in_progress' }
    checks.cases.push(test)
    try {
      await prepare()
      await action()
      test.browserErrors = result.browserErrors - beforeErrors
      expect(test.browserErrors).toBe(0)
      test.result = 'passed'
    } catch (error) {
      test.browserErrors = result.browserErrors - beforeErrors
      test.result = 'failed'
      test.error = { name: error.name, action: checks.action }
      test.countryInputCount = await input.count()
      if (test.countryInputCount === 1) {
        const value = await input.inputValue()
        test.countryInput = /^[+0-9]*$/.test(value) ? value : 'search-text'
      }
    }
  }

  await runCase('four-step-navigation', async () => {
    checks.action = 'step-buttons'
    for (const index of [0, 1, 2, 3, 2, 1, 0]) {
      await steps.nth(index).click()
      await expect(steps.nth(index)).toHaveAttribute('aria-current', 'step')
      await expect(page.getByTestId('stepper').locator('[aria-current="step"]')).toHaveCount(1)
    }
    checks.action = 'next-button'
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step')
  })
  for (const [query, option, code] of [
    ['canada', /\+1\s*Canada$/, '+1'],
    ['CANADA', /\+1\s*Canada$/, '+1'],
    ['cA', /\+1\s*Canada$/, '+1'],
    ['deutschland', /\+49\s*Deutschland$/, '+49']
  ]) {
    await runCase('search-' + query, async () => {
      await selectCanada()
      checks.action = 'search-' + query
      await input.fill(query)
      await input.press('ArrowDown')
      await page.waitForTimeout(500)
      const match = page.getByRole('option', { name: option })
      await expect(match).toBeVisible({ timeout: 4000 })
      await match.click()
      await expect(input).toHaveValue(code)
      await remount()
      checks.action = 'search-selection-after-remount'
      await expect(input).toHaveValue(code)
    })
  }
  for (const code of ['44', '9999']) {
    await runCase('manual-code-' + code, async () => {
      await selectCanada()
      checks.action = 'manual-code-entry'
      await input.fill(code)
      await input.press('Tab')
      await expect(input).toHaveValue(code)
      await remount()
      checks.action = 'manual-code-after-remount'
      await expect(input).toHaveValue('+' + code, { timeout: 4000 })
    })
  }
  await runCase('clear-selected-country', async () => {
    await selectCanada()
    checks.action = 'clear-country-entry'
    await input.fill('')
    await input.press('Tab')
    await expect(input).toHaveValue('')
    await remount()
    checks.action = 'clear-country-after-remount'
    await expect(input).toHaveValue('')
  })
  await runCase('canadian-phone-mask', async () => {
    await selectCanada()
    checks.action = 'phone-mask-entry'
    const number = page.getByTestId('phone-number')
    await number.fill('')
    await number.pressSequentially('2505550100', { delay: 60 })
    await number.press('Tab')
    await expect(number).toHaveValue('(250) 555-0100')
    await remount()
    checks.action = 'phone-mask-after-remount'
    await expect(input).toHaveValue('+1')
    await expect(number).toHaveValue('(250) 555-0100')
  })
  // Keep the failed immediate-Tab assertions above. These additional controls
  // distinguish model persistence from Headless UI selecting an active option
  // on Tab/blur before or after Nuxt UI's debounced results have updated.
  for (const mode of ['settled-tab', 'escape-then-tab']) {
    for (const code of ['44', '9999', '']) {
      await runCase(mode + '-' + (code || 'clear'), async () => {
        await selectCanada()
        checks.action = mode + '-entry'
        await input.fill(code)
        await expect(input).toHaveValue(code)
        await page.waitForTimeout(500)
        if (mode === 'escape-then-tab') await input.press('Escape')
        await input.press('Tab')
        checks.action = mode + '-blur'
        await expect(input).toHaveValue(code)
        await remount()
        checks.action = mode + '-remount'
        await expect(input).toHaveValue(code ? '+' + code : '')
      })
    }
  }
  result.stage = 'form-controls-results'
  expect(checks.cases.filter(test => test.result !== 'passed').map(test => test.name)).toEqual([])
  checks.result = 'passed'
}
