import { expect, type Page } from '@playwright/test'

export const assertLookupAddress = async (
  section: ReturnType<Page['locator']>,
  lookupAddress: string | {
    streetNumber: string
    streetName: string
    city: string
    postalCode: string
  },
  assertPostalCode = true
) => {
  if (typeof lookupAddress === 'string') {
    await expect(section).toContainText(lookupAddress)
  } else {
    await expect(section).toContainText(lookupAddress.streetNumber)
    await expect(section).toContainText(lookupAddress.streetName)
    await expect(section).toContainText(lookupAddress.city)
    if (assertPostalCode) {
      await expect(section).toContainText(lookupAddress.postalCode)
    }
  }
}
