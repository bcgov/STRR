import { expect } from '@playwright/test'
import { fillHostForm } from './host-checkout.mjs'
import { fillPlatformForm } from './platform-fee-guard.mjs'
import { fillStrataForm } from './strata-fee-guard.mjs'

export async function verifyReviewSections(page, result, app) {
  const checks = result.reviewSections = {
    scope: 'Existing titled/default-slot review pages, validation recovery and unsaved form state. The optional untitled-item regression is covered separately by component tests. No application, document or payment writes.',
    cases: []
  }
  const steps = page.getByTestId('stepper').getByRole('button')
  const review = page.getByTestId(app === 'platform' ? 'platform-review-confirm' : 'strata-review-confirm')
  const errors = review.getByText('This step is unfinished.', { exact: true })
  const completed = name => checks.cases.push({ name, result: 'passed' })
  page.on('dialog', dialog => dialog.type() === 'beforeunload' ? dialog.accept() : dialog.dismiss())
  result.testFixture = 'Unsaved Review QA ' + process.env.GITHUB_RUN_ID
  if (app === 'host') await fillHostForm(page, result)
  else if (app === 'platform') await fillPlatformForm(page, result)
  else await fillStrataForm(page, result)
  result.stage = 'review-initial-state'
  checks.initial = { stepCount: await steps.count(), reviewCount: await review.count(),
    reviewVisible: await review.isVisible(), unfinishedSections: await errors.count() }
  await expect(steps).toHaveCount(4)
  await expect(review).toBeVisible()
  await expect(errors).toHaveCount(0)

  if (app === 'host') {
    result.stage = 'review-host-address-order'
    const values = review.getByTestId('address-breakdown-display').locator('tbody tr td:last-child')
    const expected = ['5300', '44A Ave NW', 'Chetwynd', 'BC', 'V0C 1J0']
    await expect(values).toHaveCount(expected.length)
    expect((await values.allTextContents()).map(value => value.trim())).toEqual(expected)
    completed('address-fields-and-order')

    result.stage = 'review-host-edit-owner'
    await steps.nth(1).click()
    await page.getByTestId('edit-owner-btn').click()
    const owner = page.getByTestId('host-owner')
    const email = 'strr-review-qa@example.com'
    await owner.getByTestId('host-owner-email').fill(email)
    await owner.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(owner).not.toBeVisible()
    await steps.nth(3).click()
    await expect(review.getByText(email, { exact: true })).toBeVisible()
    await expect(errors).toHaveCount(0)
    completed('owner-edit-preserved-in-review')

    result.stage = 'review-host-edit-property'
    await steps.nth(0).click()
    const nickname = result.testFixture + ' edited'
    await page.getByTestId('rental-unit-address-nickname').fill(nickname)
    await steps.nth(3).click()
    await expect(review.getByText(nickname, { exact: true })).toBeVisible()
    await expect(review.getByText(email, { exact: true })).toBeVisible()
    expect((await values.allTextContents()).map(value => value.trim())).toEqual(expected)
    await expect(page.getByTestId('agreedToRentalAct-checkbox')).toBeChecked()
    await expect(page.getByTestId('agreedToSubmit-checkbox')).toBeChecked()
    completed('property-and-confirmations-preserved')
  } else {
    result.stage = 'review-business-filled-summary'
    await expect(review.getByText(result.testFixture, { exact: true })).toHaveCount(2)
    await expect(review.getByText('TEST representative', { exact: true })).toBeVisible()
    completed('titled-and-slotted-summary-content')

    result.stage = 'review-business-invalid-contact'
    await steps.nth(0).click()
    const position = page.getByTestId('platform-primary-rep-position')
    await position.fill('')
    await steps.nth(3).click()
    await expect(errors).toHaveCount(1)
    await expect(review.getByText(result.testFixture, { exact: true })).toHaveCount(2)
    await review.getByRole('button', { name: 'Return to this step to finish it', exact: true }).click()
    await expect(steps.nth(0)).toHaveAttribute('aria-current', 'step')
    await expect(position).toHaveValue('')
    await position.fill('TEST representative')
    await steps.nth(3).click()
    await expect(errors).toHaveCount(0)
    await expect(review.getByText('TEST representative', { exact: true })).toBeVisible()
    completed('validation-return-and-recovery')

    result.stage = 'review-business-state-roundtrip'
    await steps.nth(1).click()
    const prefix = app === 'platform' ? 'platform' : 'strata'
    await expect(page.getByTestId(prefix + '-business-legal-name')).toHaveValue(result.testFixture)
    await expect(page.getByTestId(prefix + '-business-address-street')).toHaveValue('123 Test Street')
    await steps.nth(3).click()
    await expect(review.getByText(result.testFixture, { exact: true })).toHaveCount(2)
    await expect(page.getByTestId('confirmation-checkbox')).toBeChecked()
    completed('business-and-confirmation-state-preserved')
  }
  await expect(steps.nth(3)).toHaveAttribute('aria-current', 'step')
  checks.result = 'passed'
}
