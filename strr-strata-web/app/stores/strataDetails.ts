import { z } from 'zod'

export const useStrrStrataDetailsStore = defineStore('strr/strataDetails', () => {
  const {
    addNewEmptyBrand: baseAddNewEmptyBrand,
    getBrandSchema: getStrataBrandSchema,
    removeBrandAtIndex: baseRemoveBrandAtIndex
  } = useStrrBaseBrand()

  const getStrataDetailsSchema = () => z.object({
    numberOfUnits: z.number(),
    brands: z.array(getStrataBrandSchema())
  })

  const strataDetails = ref<{ brands: StrrBrand[], numberOfUnits: number | undefined }>({
    brands: [{ name: '', website: '' }],
    numberOfUnits: undefined
  })

  const addNewEmptyBrand = () => {
    baseAddNewEmptyBrand(strataDetails)
  }

  const removeBrandAtIndex = (index: number) => {
    baseRemoveBrandAtIndex(strataDetails, index)
  }

  const validateStrataDetails = (returnBool = false): MultiFormValidationResult | boolean => {
    const result = validateSchemaAgainstState(getStrataDetailsSchema(), strataDetails.value, 'strata-details-form')

    if (returnBool) {
      return result.success === true
    } else {
      return [result]
    }
  }

  return {
    strataDetails,
    getStrataBrandSchema,
    getStrataDetailsSchema,
    addNewEmptyBrand,
    removeBrandAtIndex,
    validateStrataDetails
  }
})
