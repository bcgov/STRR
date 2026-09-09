import { expect } from '@playwright/test'
import { createHash } from 'node:crypto'

export function loadTestCard(secrets) {
  let fixture
  try { fixture = JSON.parse(process.env.CYPRESS_CREDITCARD || '') }
  catch { throw new Error('The stored Cypress card fixture is missing or is not valid JSON') }
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

// Resume the unpaid invoice created by run 34415112813; do not create another.
export async function preparePlatformCheckout(page, result, card) {
  result.testFixture = 'Nuxt4 Payment QA 34415112813'
  result.applicationNumber = '99151191801944'
  result.invoiceId = 771473
  result.initialStatusFromCreation = 'PAYMENT_DUE'
  result.applicationResponses = []
  const pending = []
  page.on('response', response => {
    const url = new URL(response.url())
    if (url.hostname !== 'strr-api-test-166050292631.northamerica-northeast1.run.app' ||
        !url.pathname.includes('/applications/' + result.applicationNumber)) return
    const entry = { path: url.pathname, method: response.request().method(), status: response.status() }
    result.applicationResponses.push(entry)
    if (response.ok() && !url.pathname.endsWith('/receipt')) {
      pending.push(response.json().then(body => {
        if (body.header) {
          entry.applicationStatus = body.header.status
          entry.paymentStatus = body.header.paymentStatus
        }
      }).catch(() => {}))
    }
    if (response.ok() && url.pathname.endsWith('/payment/receipt')) {
      pending.push(response.body().then(body => {
        result.receipt = { status: response.status(), bytes: body.length,
          pdf: body.subarray(0,5).toString() === '%PDF-',
          sha256: createHash('sha256').update(body).digest('hex') }
      }))
    }
  })
  result.stage = 'resume-platform-checkout'
  await page.goto('https://test.account.bcregistry.gov.bc.ca/makepayment/771473/https%3A%2F%2Ftest.platform.shorttermrental.registry.gov.bc.ca%2Fen-CA%2Fplatform%2Fdashboard')
  await page.waitForURL(url => url.hostname === 'paytestp.gov.bc.ca', { timeout: 60000 })
  await page.getByRole('button', { name: 'Proceed To Pay', exact: true }).click()
  await page.waitForURL(url => url.hostname === 'web.na.bambora.com', { timeout: 60000 })
  await expect(page.getByText('Account paybc_testp is in test mode', { exact: true })).toBeVisible()
  result.gatewayTestModeVerified = true

  // Field IDs and option values were observed at the actual Worldline TEST checkout.
  const amount = Number((await page.locator('#trnAmount').inputValue()).replace(/[^0-9.]/g,''))
  expect(amount).toBeGreaterThan(0)
  result.amount = amount
  result.stage = 'submit-sandbox-card'
  const cardType = card.number.startsWith('4') ? 'VI' : /^[25]/.test(card.number) ? 'MC' : /^3[47]/.test(card.number) ? 'AM' : undefined
  if (!cardType) throw new Error('Stored sandbox card type is not supported by this verification')
  await page.locator('#trnCardType').selectOption(cardType)
  await page.locator('#trnCardNumber').fill(card.number)
  await page.locator('#trnExpMonth').selectOption(String(card.month).padStart(2,'0'))
  await page.locator('#trnExpYear').selectOption(String(card.year).slice(-2))
  await page.locator('#trnCardCvd').fill(card.cvv)
  result.cardSubmittedAt = new Date().toISOString()
  await page.locator('#submitButton').click()

  result.stage = 'verify-platform-return'
  await page.waitForURL(url => url.origin === 'https://test.platform.shorttermrental.registry.gov.bc.ca' &&
    url.pathname === '/en-CA/platform/dashboard', { timeout: 90000 })
  await expect(page.getByTestId('h1')).toContainText(result.testFixture, { timeout: 30000 })
  result.returnedToCorrectApplication = true
  result.stage = 'verify-platform-receipt'
  const receiptResponse = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/applications/' + result.applicationNumber + '/payment/receipt',
    { timeout: 45000 })
  await page.getByRole('button', { name: 'Download Receipt', exact: true }).click()
  await receiptResponse
  await Promise.all(pending)
  expect(result.receipt?.status).toBe(200)
  expect(result.receipt?.pdf).toBe(true)
  expect(result.receipt?.bytes).toBeGreaterThan(500)

  result.stage = 'verify-platform-persistence'
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('h1')).toContainText(result.testFixture, { timeout: 30000 })
  await expect(page.getByRole('button', { name: 'Download Receipt', exact: true })).toBeVisible()
  await Promise.all(pending)
  result.paymentResult = 'passed'
  result.completedAt = new Date().toISOString()
}
