import { expect } from '@playwright/test'

export async function verifyStepperNavigation(page, result, app) {
  const checks = result.stepperNavigation = {
    scope: 'Actual unsaved four-step forms: initial selection, mouse/keyboard navigation and Next/Back. Dynamic step-array initialization remains component-tested. No application or payment submissions.',
    cases: []
  }
  const steps = page.getByTestId('stepper').getByRole('button')
  const next = page.getByRole('button', { name: 'Next', exact: true })
  const back = page.getByRole('button', { name: 'Back', exact: true })
  const selected = async index => {
    await expect(steps.nth(index)).toHaveAttribute('aria-current', 'step')
    await expect(page.getByTestId('stepper').locator('[aria-current="step"]')).toHaveCount(1)
  }
  const completed = name => checks.cases.push({ name, result: 'passed' })

  result.stage = 'stepper-initial-selection'
  await page.goto(new URL('/en-CA' + app.application, page.url()).href, { waitUntil: 'domcontentloaded' })
  await expect(steps).toHaveCount(4)
  await selected(0)
  await expect(next).toBeVisible()
  await expect(back).toHaveCount(0)
  completed('initial-selection-and-first-step-controls')

  result.stage = 'stepper-mouse-navigation'
  for (const index of [1, 2, 3, 2, 1, 0]) {
    await steps.nth(index).click()
    await selected(index)
  }
  completed('mouse-forward-and-backward-navigation')

  result.stage = 'stepper-keyboard-navigation'
  for (const [index, key] of [[2, 'Enter'], [1, 'Space']]) {
    await steps.nth(index).focus()
    await steps.nth(index).press(key)
    await selected(index)
    await expect(steps.nth(index)).toBeFocused()
  }
  completed('keyboard-enter-space-and-focus')

  result.stage = 'stepper-next-back-controls'
  await steps.nth(0).click()
  await next.click()
  await selected(1)
  await back.click()
  await selected(0)
  await expect(back).toHaveCount(0)
  for (const index of [1, 2, 3]) {
    await next.click()
    await selected(index)
  }
  await expect(next).toHaveCount(0)
  await expect(back).toBeVisible()
  completed('next-back-and-final-step-controls')
  result.stage = 'stepper-return-to-contact'
  await steps.nth(0).click()
  await selected(0)
  await expect(page.getByTestId('completing-party-radio-group')).toBeVisible()
  checks.result = 'passed'
}
