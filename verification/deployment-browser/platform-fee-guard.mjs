import { expect } from '@playwright/test'

// Browser-only negative/positive controls. The application POST never reaches the API.
export async function verifyPlatformFeeGuard(page, result, environment) {
  const origin = `https://${environment}.platform.shorttermrental.registry.gov.bc.ca`
  const guard = result.feeGuard = { failedFeeRequests: 0, interceptedSubmissions: 0, recoveredFeeStatuses: [] }
  const feePattern = '**/api/v1/fees/STRR/PLATREG_SM*'
  const failFee = async route => {
    expect(new URL(route.request().url()).hostname.startsWith(`pay-api-${environment}-`)).toBe(true)
    guard.failedFeeRequests++
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Synthetic QA fee outage"}' })
  }
  const stopSubmission = async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.hostname.startsWith(`strr-api-${environment}-`) && url.pathname === '/applications' && request.method() === 'POST') {
      guard.interceptedSubmissions++
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"QA intercepted submission; no record created"}' })
    } else await route.fallback()
  }
  await page.route('**/applications', stopSubmission)
  await page.route(feePattern, failFee)
  page.on('dialog', dialog => dialog.type() === 'beforeunload' ? dialog.accept() : dialog.dismiss())

  async function fillForm() {
    const fixture = 'Platform Fee Guard QA ' + process.env.GITHUB_RUN_ID
    await page.getByTestId('completing-party-radio-group').getByRole('radio', { name: 'Yes', exact: true }).check()
    await page.getByTestId('platform-primary-rep-position').fill('TEST representative')
    await page.getByTestId('phone-countryCode').fill('1')
    await page.getByRole('option').first().click()
    await page.getByTestId('phone-number').fill('2505550100')
    await page.getByTestId('platform-primary-rep-party-email').fill('strr-payment-qa@example.com')
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await page.getByTestId('platform-business-legal-name').fill(fixture)
    await page.getByTestId('platform-business-home-jur').fill('British Columbia')
    await page.getByTestId('platform-business-hasCpbc').getByRole('radio', { name: 'No', exact: true }).check()
    await page.getByTestId('platform-business-address-country').click()
    await page.getByRole('option', { name: 'Canada', exact: true }).click()
    await page.getByTestId('platform-business-address-street').fill('123 Test Street')
    await page.getByTestId('mailingAddress.city').fill('Victoria')
    await page.getByTestId('address-region-select').click()
    await page.getByRole('option', { name: 'British Columbia', exact: true }).click()
    await page.getByTestId('mailingAddress.postalCode').fill('V8W 9P6')
    await page.getByTestId('platform-business-hasRegOffAtt').getByRole('radio', { name: 'No', exact: true }).check()
    await page.getByTestId('platform-business-noncompliance-email').fill('strr-payment-qa@example.com')
    await page.getByTestId('platform-business-takedown-email').fill('strr-payment-qa@example.com')
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await page.getByTestId('platform-brand-name-0').fill(fixture)
    await page.getByTestId('platform-brand-site-0').fill('https://example.com/strr-payment-qa')
    await page.getByTestId('platform-listingSize').getByRole('radio', { name: '249 or less', exact: true }).check()
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await page.getByTestId('confirmation-checkbox').check()
  }

  result.stage = 'platform-fee-outage-form'
  await page.goto(origin + '/en-CA/platform/application?override=true', { waitUntil: 'domcontentloaded' })
  await fillForm()
  expect(guard.failedFeeRequests).toBeGreaterThan(0)
  result.stage = 'platform-missing-fee-submit'
  await page.getByRole('button', { name: 'Submit & Pay', exact: true }).click()
  await expect(page.getByText('Unable to load registration fee', { exact: true })).toBeVisible()
  await expect(page.getByText('We could not load the registration fee. Save your application, then refresh the page and try again.', { exact: true })).toBeVisible()
  expect(guard.interceptedSubmissions).toBe(0)
  expect(new URL(page.url()).origin).toBe(origin)
  guard.blockedBeforeSubmission = true
  await page.getByRole('button', { name: 'Close', exact: true }).filter({ hasText: /^Close$/ }).click()

  result.stage = 'platform-fee-recovery'
  await page.unroute(feePattern, failFee)
  page.on('response', response => {
    const url = new URL(response.url())
    if (url.hostname.startsWith(`pay-api-${environment}-`) && url.pathname === '/api/v1/fees/STRR/PLATREG_SM') {
      guard.recoveredFeeStatuses.push(response.status())
    }
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await fillForm()
  expect(guard.recoveredFeeStatuses.includes(200)).toBe(true)
  result.stage = 'platform-positive-submit-control'
  await page.getByRole('button', { name: 'Submit & Pay', exact: true }).click()
  await expect.poll(() => guard.interceptedSubmissions).toBe(1)
  await expect(page.getByText('Unable to load registration fee', { exact: true })).toHaveCount(0)
  guard.positiveControlReachedSubmission = true
  guard.result = 'passed'
  guard.scope = 'New-registration small non-exempt fee guard and recovery; POST intercepted, no invoice or payment proof.'
}
