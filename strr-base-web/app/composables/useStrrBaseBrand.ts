// TODO: move to strr-base-web layer
import { z } from 'zod'
import { getRequiredNonEmptyString, getRequiredUrl } from '~/utils/connect-validation'

export const useStrrBaseBrand = () => {
  const { t } = useI18n()

  const getBrandSchema = () => z.object({
    name: getRequiredNonEmptyString(t('validation.brand.name')),
    website: getRequiredUrl(t('validation.brand.site'))
  })

  const addNewEmptyBrand = (details: Ref<{ brands: StrrBrand[] }>) => {
    details.value.brands.push({ name: '', website: '' })
  }

  const removeBrandAtIndex = (details: Ref<{ brands: StrrBrand[] }>, index: number) => {
    details.value.brands.splice(index, 1)
  }

  return {
    getBrandSchema,
    addNewEmptyBrand,
    removeBrandAtIndex
  }
}
