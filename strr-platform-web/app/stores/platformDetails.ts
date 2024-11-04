import { z } from 'zod'

export const useStrrPlatformDetails = defineStore('strr/platformDetails', () => {
  const {
    addNewEmptyBrand: baseAddNewEmptyBrand,
    getBrandSchema: getPlatformBrandSchema,
    removeBrandAtIndex: baseRemoveBrandAtIndex
  } = useStrrBaseBrand()

  const getPlatformDetailsSchema = () => z.object({
    listingSize: z.enum([ListingSize.UNDER_THOUSAND, ListingSize.THOUSAND_OR_MORE]),
    brands: z.array(getPlatformBrandSchema())
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

  return {
    platformDetails,
    platformDetailSchema,
    getPlatformBrandSchema,
    getPlatformDetailsSchema,
    addNewEmptyBrand,
    removeBrandAtIndex,
    validatePlatformDetails
  }
})
