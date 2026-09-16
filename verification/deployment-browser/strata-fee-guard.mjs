import { expect } from '@playwright/test'

export async function fillStrataForm(page, result) {
  result.testFixture = 'Strata Fee Guard QA ' + process.env.GITHUB_RUN_ID
  result.stage = 'strata-contact-form'
  await page.getByTestId('completing-party-radio-group').getByRole('radio', { name: 'Yes', exact: true }).check()
  await page.getByTestId('platform-primary-rep-position').fill('TEST representative')
  await page.getByTestId('phone-countryCode').fill('1')
  await page.getByRole('option').first().click()
  await page.getByTestId('phone-number').fill('2505550100')
  await page.getByTestId('platform-primary-rep-party-email').fill('strr-payment-qa@example.com')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  result.stage = 'strata-business-form'
  await page.getByTestId('strata-business-legal-name').fill(result.testFixture)
  await page.getByTestId('strata-business-home-jur').fill('British Columbia')
  await page.getByTestId('strata-business-address-country').click()
  await page.getByRole('option', { name: 'Canada', exact: true }).click()
  await page.getByTestId('strata-business-address-street').fill('123 Test Street')
  await page.getByTestId('mailingAddress.city').fill('Victoria')
  await page.getByTestId('address-region-select').click()
  await page.getByRole('option', { name: 'British Columbia', exact: true }).click()
  await page.getByTestId('mailingAddress.postalCode').fill('V8W 9P6')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  result.stage = 'strata-details-form'
  await page.getByTestId('strata-brand-name').fill(result.testFixture)
  await page.getByTestId('strata-brand-site').fill('https://example.com/strr-payment-qa')
  await page.locator('input[type="radio"][value="MULTI_UNIT_NON_PR"]').check()
  await page.getByTestId('strata-details-numberOfUnits').fill('1')
  await page.getByTestId('strata-primary-address-street').fill('123 Test Street')
  await page.getByTestId('location.city').fill('Victoria')
  await page.getByTestId('location.postalCode').fill('V8W 9P6')
  await page.locator('#unitListings-primary-unit-list').fill('101')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByTestId('confirmation-checkbox').check()
}

export async function verifyStrataFeeGuard(page, result, environment) {
  const origin = `https://${environment}.stratahotel.shorttermrental.registry.gov.bc.ca`
  const guard = result.feeGuard = { failedFeeRequests: 0, interceptedSubmissions: 0, recoveredFeeStatuses: [] }
  const feePattern = '**/api/v1/fees/STRR/STRATAREG*'
  const failFee = async route => {
    expect(new URL(route.request().url()).hostname.startsWith(`pay-api-${environment}-`)).toBe(true)
    guard.failedFeeRequests++
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Synthetic QA fee outage"}' })
  }
  await page.route('**/applications', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.hostname.startsWith(`strr-api-${environment}-`) && url.pathname === '/applications' && request.method() === 'POST') {
      guard.interceptedSubmissions++
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"QA intercepted submission; no record created"}' })
    } else await route.fallback()
  })
  await page.route(feePattern, failFee)
  page.on('dialog', dialog => dialog.type() === 'beforeunload' ? dialog.accept() : dialog.dismiss())
  await page.goto(origin + '/en-CA/strata-hotel/application', { waitUntil: 'domcontentloaded' })
  await fillStrataForm(page, result)
  expect(guard.failedFeeRequests).toBeGreaterThan(0)
  result.stage = 'strata-missing-fee-submit'
  await page.getByRole('button', { name: 'Submit & Pay', exact: true }).click()
  await expect(page.getByText('Unable to load registration fee', { exact: true })).toBeVisible()
  await expect(page.getByText('We could not load the registration fee. Save your application, then refresh the page and try again.', { exact: true })).toBeVisible()
  expect(guard.interceptedSubmissions).toBe(0)
  expect(new URL(page.url()).origin).toBe(origin)
  guard.blockedBeforeSubmission = true
  await page.getByRole('button', { name: 'Close', exact: true }).filter({ hasText: /^Close$/ }).click()

  result.stage = 'strata-fee-recovery'
  await page.unroute(feePattern, failFee)
  page.on('response', response => {
    const url = new URL(response.url())
    if (url.hostname.startsWith(`pay-api-${environment}-`) && url.pathname === '/api/v1/fees/STRR/STRATAREG') guard.recoveredFeeStatuses.push(response.status())
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await fillStrataForm(page, result)
  expect(guard.recoveredFeeStatuses.includes(200)).toBe(true)
  result.stage = 'strata-positive-submit-control'
  await page.getByRole('button', { name: 'Submit & Pay', exact: true }).click()
  await expect.poll(() => guard.interceptedSubmissions).toBe(1)
  await expect(page.getByText('Unable to load registration fee', { exact: true })).toHaveCount(0)
  guard.positiveControlReachedSubmission = true
  guard.result = 'passed'
  guard.scope = 'New-registration fee guard and recovery; POST intercepted, no invoice or payment proof.'
}
