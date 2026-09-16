import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

beforeEach(() => setActivePinia(createPinia()))

describe('optional unit number validation', () => {
  it.each([
    { label: 'omitted', input: {}, valid: true },
    { label: 'undefined', input: { unitNumber: undefined }, valid: true },
    { label: 'empty', input: { unitNumber: '' }, valid: true },
    { label: 'alphanumeric', input: { unitNumber: 'A12' }, valid: true },
    { label: 'six characters', input: { unitNumber: '123ABC' }, valid: true },
    { label: 'seven characters', input: { unitNumber: '123ABCD' }, valid: false },
    { label: 'punctuation', input: { unitNumber: 'A-12' }, valid: false },
    { label: 'whitespace', input: { unitNumber: ' ' }, valid: false },
    { label: 'null', input: { unitNumber: null }, valid: false }
  ])('validates $label without changing the other address fields', ({ input, valid }) => {
    const store = useHostPropertyStore()
    store.useManualAddressInput = true
    const address = {
      streetNumber: '123',
      streetName: 'Main St',
      city: 'Victoria',
      region: 'BC',
      postalCode: 'V8V 1A1',
      country: 'CA',
      ...input
    }
    const result = store.getUnitAddressSchema2().safeParse({ address })
    expect(result.success).toBe(valid)
    if (result.success) {
      expect(result.data.address).toEqual(address)
    } else {
      expect(result.error.issues.every(issue => issue.path.join('.') === 'address.unitNumber')).toBe(true)
    }
  })
})
