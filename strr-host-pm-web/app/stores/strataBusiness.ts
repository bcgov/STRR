export const useStrrStrataBusinessStore = defineStore('strr/strataBusiness', () => {
  const {
    strrBusiness: strataBusiness,
    isMailingInBC,
    getBaseBusinessSchema: getBusinessSchema,
    getEmptyBusiness
  } = useStrrBaseBusiness<StrrBusiness>()

  strataBusiness.value = getEmptyBusiness()

  const validateStrataBusiness = (returnBool = false): MultiFormValidationResult | boolean => {
    const schema = getBusinessSchema()
    if (!schema) {
      return false
    }

    const result = validateSchemaAgainstState(schema, strataBusiness.value, 'business-details-form')

    if (returnBool) {
      return result.success === true
    } else {
      return [result]
    }
  }

  const $reset = () => {
    strataBusiness.value = getEmptyBusiness()
  }

  return {
    strataBusiness,
    isMailingInBC,
    getBusinessSchema,
    validateStrataBusiness,
    $reset
  }
})
