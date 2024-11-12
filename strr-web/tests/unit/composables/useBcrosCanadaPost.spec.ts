// @vitest-environment nuxt
import { it, expect } from 'vitest'

it('begins with empty address', () => {
  const {
    address
  } = useCanadaPostAddress()

  expect(address.address).toEqual('')
  expect(address.addressLineTwo).toEqual('')
  expect(address.city).toEqual('')
  expect(address.province).toEqual('')
  expect(address.postalCode).toEqual('')
  expect(address.country).toEqual('')
})

it('sets the active address field', () => {
  const {
    activeAddressField,
    enableAddressComplete
  } = useCanadaPostAddress()

  const id = 'id'
  const countryIso2 = 'CA'
  const countrySelect = true

  enableAddressComplete(id, countryIso2, countrySelect)

  expect(activeAddressField.value).toEqual(id)
})
