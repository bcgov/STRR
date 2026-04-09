export const useStrrStrataBusinessStore = defineStore('strr/strataBusiness', () => {
  const {
    strrBusiness: strataBusiness,
    isMailingInBC,
    getBaseBusinessSchema,
    getEmptyBusiness
  } = useStrrBaseBusiness<StrrBusiness>()

  const getBusinessSchema = () => {
    return getBaseBusinessSchema().omit({
      hasRegOffAtt: true,
      regOfficeOrAtt: true
    })
  }

  const validateStrataBusiness = (returnBool = false): MultiFormValidationResult | boolean => {
    const schema = getBusinessSchema()
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
