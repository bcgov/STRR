import { z } from 'zod'
import { getRequiredNonEmptyString, getRequiredUrl } from '~/utils/connect-validation'

export const useStrrPlatformDetails = defineStore('strr/platformDetails', () => {
  const { t } = useI18n()

  const getPlatformBrandSchema = () => z.object({
    name: getRequiredNonEmptyString(t('validation.brand.name')),
    website: getRequiredUrl(t('validation.brand.site'))
  })

  const getPlatformDetailsSchema = () => z.object({
    listingSize: z.enum([ListingSize.UNDER_THOUSAND, ListingSize.THOUSAND_OR_MORE]),
    brands: z.array(getPlatformBrandSchema())
  })

  const platformDetailSchema = getPlatformDetailsSchema()

  const platformDetails = ref<{ brands: PlatBrand[], listingSize: ListingSize | undefined }>({
    brands: [{ name: '', website: '' }],
    listingSize: undefined
  })

  const addNewEmptyBrand = () => {
    platformDetails.value.brands.push({ name: '', website: '' })
  }
  const removeBrandAtIndex = (index: number) => {
    platformDetails.value.brands.splice(index, 1)
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
