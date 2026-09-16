import { expect } from '@playwright/test'

export async function inspectDocumentFixtures(page, result, apiOrigin, apiHeaders, applications, registrations) {
  result.stage = 'document-fixture-read-only-inventory'
  expect(applications.applications.length).toBe(applications.total)
  const nocStatuses = ['NOC_PENDING', 'PROVISIONAL_REVIEW_NOC_PENDING', 'NOC_EXPIRED', 'PROVISIONAL_REVIEW_NOC_EXPIRED']
  result.documentInventory = {
    scope: 'Selected synthetic account only. Read application/registration eligibility; no uploads, status changes or payments.',
    applications: applications.applications.map(item => ({
      number: item.header.applicationNumber,
      status: item.header.status,
      paymentStatus: item.header.paymentStatus,
      registrationId: item.header.registrationId,
      nocUploadStatus: nocStatuses.includes(item.header.status)
    })),
    registrations: []
  }
  for (const registration of registrations.registrations) {
    const response = await page.request.get(apiOrigin + '/registrations/' + registration.id, { headers: apiHeaders })
    expect(response.status()).toBe(200)
    const body = await response.json()
    result.documentInventory.registrations.push({
      id: registration.id,
      status: body.status,
      nocStatus: body.nocStatus ?? null,
      nocUploadStatus: ['NOC_PENDING', 'NOC_EXPIRED'].includes(body.nocStatus),
      jurisdiction: body.unitDetails?.jurisdiction ?? null,
      documentCount: body.documents?.length ?? null
    })
  }
  result.documentInventory.result = 'passed-read-only-inventory-not-upload-verification'
}
