import { z } from 'zod'

export const useStrrPlatformDetails = defineStore('strr/platformDetails', () => {
  const { t } = useI18n()
  const {
    addNewEmptyBrand: baseAddNewEmptyBrand,
    removeBrandAtIndex: baseRemoveBrandAtIndex
  } = useStrrBaseBrand()

  const getPlatformSchema = () => z.object({
    name: getRequiredNonEmptyString(t('validation.platformName')),
    website: getRequiredUrl(t('validation.platformSite'))
  })

  const getPlatformDetailsSchema = () => z.object({
    listingSize: z.enum([ListingSize.THOUSAND_AND_ABOVE, ListingSize.BETWEEN_250_AND_999, ListingSize.LESS_THAN_250]),
    brands: z.array(getPlatformSchema())
  })

  const platformDetailSchema = getPlatformDetailsSchema()

  const platformDetails = ref<{ brands: StrrBrand[], listingSize: ListingSize | undefined }>({
    brands: [{ name: '', website: '' }],
    listingSize: undefined
  })

  const addNewEmptyBrand = () => {
    baseAddNewEmptyBrand(platformDetails)
  }

  const removeBrandAtIndex = (index: number) => {
    baseRemoveBrandAtIndex(platformDetails, index)
  }

  const validatePlatformDetails = (returnBool = false): MultiFormValidationResult | boolean => {
    const result = validateSchemaAgainstState(platformDetailSchema, platformDetails.value, 'platform-details-form')

    if (returnBool) {
      return result.success === true
    } else {
      return [result]
    }
  }

  const $reset = () => {
    platformDetails.value = {
      brands: [{ name: '', website: '' }],
      listingSize: undefined
    }
  }

  return {
    platformDetails,
    platformDetailSchema,
    getPlatformDetailsSchema,
    addNewEmptyBrand,
    removeBrandAtIndex,
    validatePlatformDetails,
    $reset
  }
})
