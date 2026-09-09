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

// Observe only status metadata for the explicitly created TEST application.
export function observeApplication(page, result) {
  result.applicationResponses = []
  const pending = []
  page.on('response', response => {
    const url = new URL(response.url())
    if (url.hostname !== 'strr-api-test-166050292631.northamerica-northeast1.run.app' ||
        !url.pathname.includes('/applications/' + result.applicationNumber) || url.pathname.endsWith('/receipt')) return
    const entry = { path: url.pathname, method: response.request().method(), status: response.status() }
    result.applicationResponses.push(entry)
    if (response.ok()) pending.push(response.json().then(body => {
      if (body.header) {
        entry.applicationStatus = body.header.status
        entry.paymentStatus = body.header.paymentStatus
      }
    }).catch(() => {}))
  })
  return pending
}

export async function paySandboxCard(page, result, card) {
  result.stage = 'sandbox-checkout'
  await page.waitForURL(url => url.hostname === 'paytestp.gov.bc.ca', { timeout: 60000 })
  await page.getByRole('button', { name: 'Proceed To Pay', exact: true }).click()
  await page.waitForURL(url => url.hostname === 'web.na.bambora.com', { timeout: 60000 })
  await expect(page.getByText('Account paybc_testp is in test mode', { exact: true })).toBeVisible()
  result.gatewayTestModeVerified = true
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
}

export async function verifyPaidApplication(page, result, dashboard, pending) {
  result.stage = 'verify-payment-return'
  await page.waitForURL(url => url.origin + url.pathname === dashboard, { timeout: 90000 })
  await expect(page.getByTestId('h1')).toContainText(result.testFixture, { timeout: 30000 })
  result.returnedToCorrectApplication = true
  result.stage = 'verify-receipt'
  const [response, download] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname ===
      '/applications/' + result.applicationNumber + '/payment/receipt', { timeout: 45000 }),
    page.waitForEvent('download', { timeout: 45000 }),
    page.getByRole('button', { name: 'Download Receipt', exact: true }).click()
  ])
  const stream = await download.createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  const file = Buffer.concat(chunks)
  const body = await response.body()
  const receiptHeaders = await response.request().allHeaders()
  const apiHeaders = { authorization: receiptHeaders.authorization, 'account-id': receiptHeaders['account-id'] }
  result.receipt = {
    status: response.status(), responseBytes: body.length, downloadBytes: file.length,
    pdf: file.subarray(0,5).toString() === '%PDF-',
    sha256: createHash('sha256').update(file).digest('hex'),
    contentType: response.headers()['content-type'],
    filename: download.suggestedFilename()
  }
  // If the downloaded file is empty, compare the exact API request without
  // exporting its authenticated headers. This distinguishes server output from UI handling.
  if (!result.receipt.pdf || file.length < 500) {
    const apiResponse = await page.request.get(response.url(), { headers: { ...apiHeaders, accept: 'application/pdf' }, timeout: 60000 })
    const apiBody = await apiResponse.body()
    result.receipt.directApi = { status: apiResponse.status(), bytes: apiBody.length,
      pdf: apiBody.subarray(0,5).toString() === '%PDF-', contentType: apiResponse.headers()['content-type'] }
  }
  result.receipt.result = response.status() === 201 && result.receipt.pdf && file.length > 500 ? 'passed' : 'failed'
  result.stage = 'verify-payment-persistence'
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('h1')).toContainText(result.testFixture, { timeout: 30000 })
  await expect(page.getByRole('button', { name: 'Download Receipt', exact: true })).toBeVisible()
  await Promise.all(pending)
  const applicationResponse = await page.request.get(
    'https://strr-api-test-166050292631.northamerica-northeast1.run.app/applications/' + result.applicationNumber,
    { headers: apiHeaders, timeout: 30000 }
  )
  expect(applicationResponse.status()).toBe(200)
  const application = await applicationResponse.json()
  result.persistedApplication = { status: application.header.status, paymentStatus: application.header.paymentStatus,
    invoiceId: application.header.paymentToken, registrationNumber: application.header.registrationNumber }
  expect(result.persistedApplication.paymentStatus).toBe('COMPLETED')
  expect(Number(result.persistedApplication.invoiceId)).toBe(Number(result.invoiceId))
  result.paymentResult = 'passed'
  result.persistedAfterReload = true
  result.completedAt = new Date().toISOString()
}

// Read-only verification of the already paid invoice. Never resubmit its card.
export async function preparePlatformCheckout(page, result) {
  result.testFixture = 'Nuxt4 Payment QA 34415112813'
  result.applicationNumber = '99151191801944'
  result.invoiceId = 771473
  result.amount = 601.5
  result.cardPaidInRun = '34415657951'
  const pending = observeApplication(page, result)
  const dashboard = 'https://test.platform.shorttermrental.registry.gov.bc.ca/en-CA/platform/dashboard'
  await page.goto(dashboard)
  await verifyPaidApplication(page, result, dashboard, pending)
}
