import { z } from 'zod'
import type { StrataDetails } from '~/interfaces/strata-details'

export const useStrrStrataDetailsStore = defineStore('strr/strataDetails', () => {
  const { t } = useI18n()
  const { getBrandSchema: getStrataBrandSchema } = useStrrBaseBrand()

  const strataDetailsSchema = z.object({
    numberOfUnits: z.number(),
    brand: getStrataBrandSchema(),
    buildings: z.array(getRequiredAddress(
      t('validation.address.street'),
      t('validation.address.city'),
      t('validation.address.region'),
      t('validation.address.postalCode'),
      t('validation.address.country')
    )),
    location: getRequiredAddress(
      t('validation.address.street'),
      t('validation.address.city'),
      t('validation.address.region'),
      t('validation.address.postalCode'),
      t('validation.address.country')
    )
  })

  const strataDetails = ref<StrataDetails>({
    brand: { name: '', website: '' },
    buildings: [],
    location: {
      country: 'CA',
      street: '',
      streetAdditional: '',
      city: '',
      region: 'BC',
      postalCode: '',
      locationDescription: ''
    },
    numberOfUnits: undefined
  })

  const addNewEmptyBuilding = () => {
    strataDetails.value.buildings.push({
      country: 'CA',
      street: '',
      streetAdditional: '',
      city: '',
      region: 'BC',
      postalCode: '',
      locationDescription: ''
    })
  }

  const removeBuildingAtIndex = (index: number) => {
    strataDetails.value.buildings.splice(index, 1)
  }

  const validateStrataDetails = (returnBool = false): MultiFormValidationResult | boolean => {
    const result = validateSchemaAgainstState(strataDetailsSchema, strataDetails.value, 'strata-details-form')

    if (returnBool) {
      return result.success === true
    } else {
      return [result]
    }
  }

  return {
    strataDetails,
    getStrataBrandSchema,
    strataDetailsSchema,
    addNewEmptyBuilding,
    removeBuildingAtIndex,
    validateStrataDetails
  }
})
