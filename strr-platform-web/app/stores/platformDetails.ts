import { z } from 'zod'
import { getRequiredNonEmptyString, getRequiredUrl } from '~/utils/connect-validation'

export const useStrrPlatformDetails = defineStore('strr/platformDetails', () => {
  const { t } = useI18n()
  const getPlatformBrandSchema = () => z.object({
    name: getRequiredNonEmptyString(t('validation.brand.name')),
    website: getRequiredUrl(t('validation.brand.site'))
  })

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
  return {
    platformDetails,
    getPlatformBrandSchema,
    addNewEmptyBrand,
    removeBrandAtIndex
  }
})
