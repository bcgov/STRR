import { z } from 'zod'
import { FetchError } from 'ofetch'

interface AddressRequirements {
  isBusinessLicenceRequired: boolean
  isPrincipalResidenceRequired: boolean
  isStrProhibited: boolean
  isStraaExempt: boolean | null
  organizationNm: string
}

interface AddressRequirementsError {
  error?: FetchError
  type: 'fetch' | 'unknown' // TODO: handle other error types
}

interface PrRequirements {
  isPropertyPrExempt: boolean
  prExemptionReason: PrExemptionReason | undefined
  strataRefCode: string
}

export const usePrReqStore = defineStore('pr/requirements', () => {
  const { t } = useI18n()
  const { $strrApi } = useNuxtApp()

  const { isUnitNumberRequired } = storeToRefs(useHostPropertyStore())

  const loadingReqs = ref<boolean>(false)
  const addressReqs = ref<AddressRequirements>({} as AddressRequirements)
  const addressReqError = ref<AddressRequirementsError>({} as AddressRequirementsError)
  const continueProhibitedApplication = ref<boolean>(false)
  const showProhibitedAlertDetails = ref<boolean>(true)

  const hasReqs = computed(() => addressReqs.value.organizationNm !== undefined) // TODO: confirm this will never be undefined in a response?

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

  // pr requirements/exemption stuff
  const prRequirementsSchema = computed(() => z.object({
    isPropertyPrExempt: z.boolean(),
    prExemptionReason: prRequirements.value.isPropertyPrExempt
      ? z.enum([
        PrExemptionReason.STRATA_HOTEL,
        PrExemptionReason.FARM_LAND,
        PrExemptionReason.FRACTIONAL_OWNERSHIP
      ])
      : z.any().optional(),
    strataRefCode: prRequirements.value.prExemptionReason === PrExemptionReason.STRATA_HOTEL
      ? z
        .string()
        .trim()
        .min(1, 'Strata Registration Number is required') // check for a non empty string
        .regex(/^ST\d{9}$/, { // 'ST + 9 digits'
          message: 'Please enter a valid format (eg: ST123456789)'
        })
      : z.string().optional()
  }))

  const getEmptyPrRequirements = (): PrRequirements => ({
    isPropertyPrExempt: false,
    prExemptionReason: undefined,
    strataRefCode: ''
  })

  const prRequirements = ref(getEmptyPrRequirements())

  // const documentReqs = computed(() => {
  // TODO: compute doc reqs based of address reqs response ??? move this computed to the documents stroe probably
  // })

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
      if (e instanceof FetchError) {
        addressReqError.value = { error: e, type: 'fetch' }
      } else {
        addressReqError.value = { type: 'unknown' }
      }
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
    addressReqError.value = {} as AddressRequirementsError
    prRequirements.value = getEmptyPrRequirements()
    continueProhibitedApplication.value = false
    showProhibitedAlertDetails.value = true
  }

  return {
    rentalAddress,
    rentalAddressSchema,
    loadingReqs,
    addressReqs,
    hasReqs,
    addressReqError,
    prRequirementsSchema,
    prRequirements,
    continueProhibitedApplication,
    showProhibitedAlertDetails,
    getAddressReqs,
    // validateProperty,
    $reset
  }
})
