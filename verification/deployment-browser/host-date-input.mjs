import { expect } from '@playwright/test'
import { fillHostForm } from './host-checkout.mjs'

export async function verifyHostDateInput(page, result) {
  result.testFixture = `Unsaved Date Input QA ${process.env.GITHUB_RUN_ID}`
  result.dateInput = { scope: 'Browser-only unsaved form; no application, document or payment writes.', cases: [] }
  const bounds = await page.evaluate(() => {
    const now = new Date()
    const format = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
    return {
      today: format(now),
      min: format(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)),
      max: format(new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())),
      aboveMax: format(new Date(now.getFullYear() + 1, now.getMonth(), now.getDate() + 1)),
      anchor: format(new Date(now.getFullYear(), now.getMonth() + 1, 10)),
      calendar: format(new Date(now.getFullYear(), now.getMonth() + 1, 11))
    }
  })
  result.dateInput.bounds = bounds
  await fillHostForm(page, result)
  const steps = page.getByTestId('stepper').getByRole('button')
  await expect(steps).toHaveCount(4)
  await steps.nth(2).click()
  const input = page.locator('#connect-date-input-businessLicenseExpiryDate')
  await expect(input).toBeVisible()
  // application.vue uses v-if per step: returning mounts a new date input from the form store.
  // This checks accepted form state, not text left in the original DOM input.
  const remount = async () => {
    await steps.nth(3).click()
    await expect(input).toHaveCount(0)
    await steps.nth(2).click()
    await expect(input).toBeVisible()
  }
  for (const [name, typed, expected] of [
    ['inclusive-minimum', bounds.min, bounds.min],
    ['inclusive-maximum', bounds.max, bounds.max],
    ['below-minimum', bounds.today, bounds.anchor],
    ['above-maximum', bounds.aboveMax, bounds.anchor],
    ['invalid-day', bounds.anchor.slice(0, 8) + '32', bounds.anchor],
    ['partial-date', bounds.anchor.slice(0, 8), bounds.anchor],
    ['clear-date', '', '']
  ]) {
    result.stage = 'date-anchor-' + name
    await input.fill(bounds.anchor)
    await remount()
    await expect(input).toHaveValue(bounds.anchor)
    result.stage = 'date-case-' + name
    await input.fill(typed)
    await remount()
    const actual = await input.inputValue()
    result.dateInput.cases.push({ name, typed, expected, actual, passed: actual === expected })
  }
  result.stage = 'date-calendar-open'
  await input.fill(bounds.anchor)
  await input.click()
  const picker = page.locator('.connect-date-picker')
  result.dateInput.calendarMarkup = {
    wrapperCount: await picker.count(),
    testIdCount: await page.getByTestId('date-picker').count(),
    dayTexts: (await picker.locator('.dp__cell_inner').allTextContents()).map(text => text.trim()).filter(text => /^\d{1,2}$/.test(text))
  }
  await expect(picker).toBeVisible()
  // Verified in the installed @vuepic/vue-datepicker 10.0.0 renderer. The app's legacy
  // calendar-cell-class-name prop does not add its requested class in this version.
  const day = picker.locator('.dp__cell_inner').filter({ hasText: /^11$/ })
  result.stage = 'date-calendar-day-target'
  await expect(day).toHaveCount(1)
  result.stage = 'date-calendar-select'
  await day.click()
  const closedAfterSelection = await expect(picker).toHaveCount(0, { timeout: 1500 }).then(() => true, () => false)
  await remount()
  const actual = await input.inputValue()
  result.dateInput.cases.push({ name: 'calendar-selection', expected: bounds.calendar, actual, closedAfterSelection,
    passed: actual === bounds.calendar && closedAfterSelection })
  result.stage = 'date-case-results'
  expect(result.dateInput.cases.filter(test => !test.passed).map(test => test.name)).toEqual([])
  result.dateInput.result = 'passed'
}
