import { expect } from '@playwright/test'

export function loadTestCard(secrets) {
  let fixture
  try {
    fixture = JSON.parse(process.env.CYPRESS_CREDITCARD || '')
  } catch {
    throw new Error('The stored Cypress card fixture is missing or is not valid JSON')
  }
  const number = String(fixture.ccnumber || '').replace(/\s/g, '')
  const cvv = String(fixture.cvv || '').trim()
  secrets.push(process.env.CYPRESS_CREDITCARD, String(fixture.ccnumber || ''), number, cvv)
  const month = Number(fixture.expirymonth)
  let year = Number(fixture.expiryyear)
  if (year < 100) year += 2000
  if (!/^\d{13,19}$/.test(number) || !/^\d{3,4}$/.test(cvv) || !(month >= 1 && month <= 12) || !(year >= 2000)) {
    throw new Error('The stored Cypress card fixture does not contain usable card fields')
  }
  if (new Date(year, month, 1) <= new Date()) {
    throw new Error('The stored Cypress test card has expired; an updated sandbox fixture is required')
  }
  return { number, cvv, month, year }
}

// Creates one explicitly labelled non-production application through the UI.
// A failed run retains the application/invoice IDs so checkout can be resumed.
export async function preparePlatformCheckout(page, result) {
  const testName = 'Nuxt4 Payment QA ' + process.env.GITHUB_RUN_ID
  const testEmail = 'strr-payment-qa@example.com'
  result.testFixture = testName
  result.stage = 'platform-contact-form'
  await page.getByTestId('completing-party-radio-group').getByRole('radio', { name: 'Yes', exact: true }).check()
  await page.getByTestId('platform-primary-rep-position').fill('TEST representative')
  await page.getByTestId('phone-countryCode').fill('1')
  await page.getByRole('option').first().click()
  await page.getByTestId('phone-number').fill('2505550100')
  await page.getByTestId('platform-primary-rep-party-email').fill(testEmail)
  await page.getByRole('button', { name: 'Next', exact: true }).click()

  result.stage = 'platform-business-form'
  await page.getByTestId('platform-business-legal-name').fill(testName)
  await page.getByTestId('platform-business-home-jur').fill('British Columbia')
  // Selecting No is important: the existing smoke fixture uses CPBC exemption,
  // which waives the fee and does not test a payment.
  await page.getByTestId('platform-business-hasCpbc').getByRole('radio', { name: 'No', exact: true }).check()
  await page.getByTestId('platform-business-address-country').click()
  await page.getByRole('option', { name: 'Canada', exact: true }).click()
  await page.getByTestId('platform-business-address-street').fill('123 Test Street')
  await page.getByTestId('mailingAddress.city').fill('Victoria')
  await page.getByTestId('address-region-select').click()
  await page.getByRole('option', { name: 'British Columbia', exact: true }).click()
  await page.getByTestId('mailingAddress.postalCode').fill('V8W 9P6')
  await page.getByTestId('platform-business-hasRegOffAtt').getByRole('radio', { name: 'No', exact: true }).check()
  await page.getByTestId('platform-business-noncompliance-email').fill(testEmail)
  await page.getByTestId('platform-business-takedown-email').fill(testEmail)
  await page.getByRole('button', { name: 'Next', exact: true }).click()

  result.stage = 'platform-provider-form'
  await page.getByTestId('platform-brand-name-0').fill(testName)
  await page.getByTestId('platform-brand-site-0').fill('https://example.com/strr-payment-qa')
  await page.getByTestId('platform-listingSize').getByRole('radio', { name: '249 or less', exact: true }).check()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByTestId('confirmation-checkbox').check()

  result.stage = 'platform-submit'
  const [response] = await Promise.all([
    page.waitForResponse(response =>
      new URL(response.url()).hostname === 'strr-api-test-166050292631.northamerica-northeast1.run.app' &&
      new URL(response.url()).pathname.endsWith('/applications') &&
      response.request().method() === 'POST', { timeout: 60000 }),
    page.getByRole('button', { name: 'Submit & Pay', exact: true }).click()
  ])
  result.submissionStatus = response.status()
  if (!response.ok()) throw new Error('TEST application submission returned HTTP ' + response.status())
  const application = await response.json()
  result.applicationNumber = application.header.applicationNumber
  result.invoiceId = application.header.paymentToken
  result.applicationStatus = application.header.status
  expect(result.applicationStatus).toBe('PAYMENT_DUE')
  expect(Number(result.invoiceId)).toBeGreaterThan(0)

  result.stage = 'inspect-payment-gateway'
  await page.waitForURL(url => /^pay(dev|test)\.gov\.bc\.ca$/.test(url.hostname), { timeout: 60000 })
  await page.locator('body').waitFor({ state: 'visible' })
  result.gateway = {
    origin: new URL(page.url()).origin,
    path: new URL(page.url()).pathname,
    title: await page.title(),
    headings: await page.locator('h1,h2').allTextContents(),
    buttons: await page.getByRole('button').allTextContents(),
    fields: await page.locator('input:not([type=hidden]),select').evaluateAll(elements =>
      elements.map(element => ({
        tag: element.tagName,
        type: element.getAttribute('type'),
        id: element.id,
        name: element.getAttribute('name'),
        label: element.getAttribute('aria-label'),
        labels: [...(element.labels || [])].map(label => label.innerText),
        placeholder: element.getAttribute('placeholder'),
        options: element.tagName === 'SELECT' ? [...element.options].map(option => ({ value: option.value, label: option.label })) : undefined
      }))
    ),
    frames: page.frames().map(frame => {
      const url = new URL(frame.url() || 'about:blank')
      return { origin: url.origin, path: url.pathname }
    })
  }
  throw new Error('TEST invoice created and sandbox checkout reached; inspect gateway fields before entering the sandbox card')
}
