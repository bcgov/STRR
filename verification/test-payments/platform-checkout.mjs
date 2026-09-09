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

// Resume the unpaid invoice created by run 34415112813, without creating
// another application. The URL was observed in that actual checkout redirect.
export async function preparePlatformCheckout(page, result) {
  result.testFixture = 'Nuxt4 Payment QA 34415112813'
  result.applicationNumber = '99151191801944'
  result.invoiceId = 771473
  result.applicationStatus = 'PAYMENT_DUE'
  result.stage = 'resume-platform-checkout'
  await page.goto('https://test.account.bcregistry.gov.bc.ca/makepayment/771473/https%3A%2F%2Ftest.platform.shorttermrental.registry.gov.bc.ca%2Fen-CA%2Fplatform%2Fdashboard')
  await page.waitForURL(url => url.hostname === 'paytestp.gov.bc.ca', { timeout: 60000 })
  await page.getByRole('button', { name: 'Proceed To Pay', exact: true }).waitFor()
  result.gatewayReview = (await page.locator('body').innerText()).slice(0,10000)
  result.stage = 'inspect-card-entry'
  await page.getByRole('button', { name: 'Proceed To Pay', exact: true }).click()
  const deadline = Date.now() + 45000
  while (Date.now() < deadline) {
    const fields = await Promise.all(page.frames().map(frame => frame.locator('input:not([type=hidden]),select').count().catch(() => 0)))
    if (fields.some(count => count >= 3)) break
    await new Promise(resolve => setTimeout(resolve,250))
  }
  result.gateway = []
  for (const frame of page.frames()) {
    const url = new URL(frame.url() || 'about:blank')
    result.gateway.push({
      origin: url.origin,
      path: url.pathname,
      body: (await frame.locator('body').innerText().catch(() => '')).slice(0,10000),
      fields: await frame.locator('input:not([type=hidden]),select').evaluateAll(elements =>
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
      ).catch(() => [])
    })
  }
  throw new Error('Existing TEST invoice resumed; inspect card-entry fields before submitting the sandbox card')
}
