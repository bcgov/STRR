import { z } from 'zod'
import type { StrataDetails } from '~/interfaces/strata-details'

export const useStrrStrataDetailsStore = defineStore('strr/strataDetails', () => {
  const { t } = useI18n()
  const { getBrandSchema: getStrataBrandSchema } = useStrrBaseBrand()

  const strataDetailsSchema = z.object({
    numberOfUnits: z
      .number(
        {
          required_error: t('validation.number'),
          invalid_type_error: t('validation.number')
        }
      )
      .int(t('validation.wholeNumber'))
      .gt(0, t('validation.min1Unit'))
      .lte(5000, t('validation.max5000Units')),
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
    ),
    category: z.enum(
      [
        StrataHotelCategory.FULL_SERVICE,
        StrataHotelCategory.MULTI_UNIT_NON_PR,
        StrataHotelCategory.POST_DECEMBER_2023
      ], {
        errorMap: () => ({ message: t('validation.category') })
      }),
    unitListings: z.object({
      primary: z.string().optional(),
      additional: z.array(z.string().optional())
    })
  })

  const getEmptyStrataDetails = () => ({
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
    numberOfUnits: undefined,
    category: undefined,
    unitListings: {
      primary: '',
      additional: []
    }
  })

  const strataDetails = ref<StrataDetails>(getEmptyStrataDetails())

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
    strataDetails.value.unitListings.additional.push('')
  }

  const removeBuildingAtIndex = (index: number) => {
    strataDetails.value.buildings.splice(index, 1)
    strataDetails.value.unitListings.additional.splice(index, 1)
  }

  /**
   * Validates that unit listings are not empty for renewal applications.
   * Checks both primary building and all additional buildings.
   */
  const createUnitListValidationResult = () => {
    const errors: z.ZodIssue[] = []

    if (!strataDetails.value.unitListings.primary?.trim()) {
      errors.push({
        code: z.ZodIssueCode.custom,
        message: t('validation.unitListRequired'),
        path: ['unitListings', 'primary']
      })
    }

    strataDetails.value.buildings.forEach((_building, index) => {
      const units = strataDetails.value.unitListings.additional[index]
      if (!units?.trim()) {
        errors.push({
          code: z.ZodIssueCode.custom,
          message: t('validation.unitListRequired'),
          path: ['unitListings', 'additional', index]
        })
      }
    })

    return {
      formId: 'strata-unit-lists-form',
      success: errors.length === 0,
      errors
    }
  }

  const validateStrataDetails = (
    returnBool = false,
    requireUnitListings = false
  ): MultiFormValidationResult | boolean => {
    const results: MultiFormValidationResult = [
      validateSchemaAgainstState(strataDetailsSchema, strataDetails.value, 'strata-details-form')
    ]

    if (requireUnitListings) {
      results.push(createUnitListValidationResult())
    }

    if (returnBool) {
      return results.every(result => result.success === true)
    } else {
      return results
    }
  }

  const $reset = () => {
    strataDetails.value = getEmptyStrataDetails()
  }

  return {
    strataDetails,
    getStrataBrandSchema,
    strataDetailsSchema,
    addNewEmptyBuilding,
    removeBuildingAtIndex,
    validateStrataDetails,
    $reset
  }
})
