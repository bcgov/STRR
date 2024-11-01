import { z } from 'zod'
import type { StrataDetails } from '~/interfaces/strata-details'

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

  const strataDetails = ref<StrataDetails>({
    brands: [{ name: '', website: '' }],
    buildings: [],
    location: {
      country: '',
      street: '',
      streetAdditional: '',
      city: '',
      region: '',
      postalCode: '',
      locationDescription: ''
    },
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
