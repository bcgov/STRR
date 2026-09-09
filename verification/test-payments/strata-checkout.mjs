import { observeApplication, verifyPaidApplication } from './platform-checkout.mjs'

// Read-only follow-up for the completed transaction in run 34416415792.
export async function createStrataPayment(page, result) {
  result.testFixture = 'Nuxt4 Strata Payment QA 34416415792'
  result.applicationNumber = '19032844564212'
  result.invoiceId = 771475
  result.amount = 601.5
  result.cardPaidInRun = '34416415792'
  const pending = observeApplication(page, result)
  const dashboard = 'https://test.stratahotel.shorttermrental.registry.gov.bc.ca/en-CA/strata-hotel/dashboard/' + result.applicationNumber
  await page.goto(dashboard)
  await verifyPaidApplication(page, result, dashboard, pending)
}
