import { reactive } from 'vue'
import { useRuntimeConfig } from '#app'
import type { CanadaPostAddressI, CanadaPostResponseAddressI } from '#imports'

export const useCanadaPostAddress = (isStreetAttributes: boolean = false) => {
  const activeAddressField = ref<string>()
  const address = reactive<CanadaPostAddressI>({
    street: '',
    streetAdditional: '',
    city: '',
    region: '',
    postalCode: '',
    country: '',
    deliveryInstructions: ''
  })

  const addressWithStreetAttributes = reactive<CanadaPostAddressWithStreetAttributesI>({
    streetNumber: '',
    streetName: '',
    unitNumber: '',
    streetAdditional: '',
    city: '',
    region: '',
    postalCode: '',
    country: '',
    deliveryInstructions: ''
  })

  const createAddressComplete = (pca: any, key: string, id: string, countryIso2: string,
    countrySelect: boolean, province?: string): object => {
    const fields = [
      { element: id, field: 'Line1', mode: pca.fieldMode.SEARCH }
    ]
    // Conditional to only allow country selection depending on control
    const bar = countrySelect ? { visible: true, showCountry: true } : {}
    const countries = {
      defaultCode: countryIso2,
      ...(countrySelect ? {} : { codesList: 'CA' })
    }
    const options = {
      key,
      bar,
      countries,
      ...(province
        ? {
            province: {
              codesList: province
            }
          }
        : {})
    }
    const addressComplete = new pca.Address(fields, options)
    if (isStreetAttributes) {
      addressComplete.listen('populate', addressCompletePopulateWithStreetAttributes)
    } else {
      addressComplete.listen('populate', addressCompletePopulate)
    }
    return addressComplete
  }

  const enableAddressComplete = (id: string, countryIso2: string, countrySelect: boolean, province?: string): void => {
    activeAddressField.value = id
    const config = useRuntimeConfig()
    const pca = (window as any).pca
    const key = config.public.addressCompleteKey
    if (!pca || !key) {
      console.log('AddressComplete not initialized due to missing script and/or key')
      return
    }
    if ((window as any).currentAddressComplete) {
      (window as any).currentAddressComplete.destroy()
    }
    (window as any).currentAddressComplete = createAddressComplete(
      pca, key, id, countryIso2, countrySelect, province
    )
  }

  const addressCompletePopulate = (addressComplete: CanadaPostResponseAddressI): void => {
    address.street = addressComplete.Line1 || 'N/A'
    address.streetAdditional = addressComplete.Line2 || ''
    address.city = addressComplete.City
    address.region = addressComplete.ProvinceCode
    address.postalCode = addressComplete.PostalCode
    address.country = addressComplete.CountryIso2
  }

  const addressCompletePopulateWithStreetAttributes = (addressComplete: CanadaPostResponseAddressI): void => {
    addressWithStreetAttributes.streetNumber = addressComplete.BuildingNumber
    addressWithStreetAttributes.streetName = addressComplete.Street
    addressWithStreetAttributes.unitNumber = addressComplete.SubBuilding || ''
    addressWithStreetAttributes.streetAdditional = addressComplete.Line2 || ''
    addressWithStreetAttributes.city = addressComplete.City
    addressWithStreetAttributes.region = addressComplete.ProvinceCode
    addressWithStreetAttributes.postalCode = addressComplete.PostalCode
    addressWithStreetAttributes.country = addressComplete.CountryIso2
  }

  return {
    activeAddressField,
    address,
    addressWithStreetAttributes,
    enableAddressComplete
  }
}
