import { expect, type Page } from '@playwright/test'

export const assertLookupAddress = async (
  section: ReturnType<Page['locator']>,
  assertAddress: string | {
    streetNumber: string
    streetName: string
    city: string
    postalCode: string
  },
  assertPostalCode = true
) => {
  if (typeof assertAddress === 'string') {
    await expect(section).toContainText(assertAddress)
  } else {
    await expect(section).toContainText(assertAddress.streetNumber)
    await expect(section).toContainText(assertAddress.streetName)
    await expect(section).toContainText(assertAddress.city)
    if (assertPostalCode) {
      await expect(section).toContainText(assertAddress.postalCode)
    }
  }
}

export const assertLookupAddressLong = async (
  section: ReturnType<Page['locator']>,
  addrNumber: string,
  addrStreet: string,
  addrCity: string,
  addrPostal: string,
  assertPostalCode = true
) => {
    await expect(section).toContainText(addrNumber)
    await expect(section).toContainText(addrStreet)
    await expect(section).toContainText(addrCity)
    if (assertPostalCode) {
      await expect(section).toContainText(addrPostal)
    }
}
