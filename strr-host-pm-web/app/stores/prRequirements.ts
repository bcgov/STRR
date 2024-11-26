import { z } from 'zod'

interface AddressRequirements {
    isBusinessLicenceRequired: boolean
    isPrincipalResidenceRequired: boolean
    isStrProhibited: boolean
    isStraaExempt: boolean | null
    organizationNm: string
}

export const usePrReqStore = defineStore('pr/requirements', () => {
  const { t } = useI18n()
  const { $strrApi } = useNuxtApp()

  const { isUnitNumberRequired } = storeToRefs(useHostPropertyStore())

  const loadingReqs = ref<boolean>(false)
  const addressReqs = ref<AddressRequirements>({} as AddressRequirements)

  const hasReqs = computed(() => addressReqs.value.organizationNm !== undefined)

  const rentalAddressSchema = computed(() => z.object({
    address: getRequiredBCAddressSplitStreet(
      t('validation.address.city'),
      t('validation.address.region'),
      t('validation.address.postalCode'),
      t('validation.address.country'),
      t('validation.address.requiredBC.region'),
      t('validation.address.requiredBC.country'),
      t('validation.address.streetName'),
      t('validation.address.streetNumber')
    ).extend({
      unitNumber: isUnitNumberRequired.value
        ? getRequiredNonEmptyString(t('validation.address.unitNumber'))
        : optionalOrEmptyString,
      nickname: optionalOrEmptyString
    })
  }))

  const getEmptyRentalAddress = () => ({
    address: {
      street: '',
      streetNumber: '',
      streetName: '',
      unitNumber: '',
      streetAdditional: '',
      region: 'BC',
      city: '',
      country: 'CA',
      postalCode: '',
      locationDescription: '',
      nickname: ''
    }
  })

  const rentalAddress = ref(getEmptyRentalAddress())

  async function getAddressReqs () {
    try {
      loadingReqs.value = true
      addressReqs.value = await $strrApi<AddressRequirements>('/address/requirements', {
        method: 'POST',
        body: {
          address: {
            unitNumber: rentalAddress.value.address.unitNumber,
            streetNumber: rentalAddress.value.address.streetNumber,
            streetName: rentalAddress.value.address.streetName,
            addressLineTwo: rentalAddress.value.address.streetAdditional,
            city: rentalAddress.value.address.city,
            postalCode: rentalAddress.value.address.postalCode,
            province: rentalAddress.value.address.region,
            country: rentalAddress.value.address.country,
            nickname: rentalAddress.value.address.nickname
          }
        }
      })
    } catch (e) {
      logFetchError(e, 'Unable to load address requirements')
    } finally {
      loadingReqs.value = false
    }
  }

  // const validateProperty = (returnBool = false): MultiFormValidationResult | boolean => {
  //   const result = validateSchemaAgainstState(
  //     propertySchema.value,
  //     property.value,
  //     'property-form')

  //   if (returnBool) {
  //     return result.success === true
  //   } else {
  //     return [result]
  //   }
  // }

  const $reset = () => {
    rentalAddress.value = getEmptyRentalAddress()
    addressReqs.value = {} as AddressRequirements
  }

  return {
    rentalAddress,
    rentalAddressSchema,
    loadingReqs,
    addressReqs,
    hasReqs,
    getAddressReqs,
    // validateProperty,
    $reset
  }
})
