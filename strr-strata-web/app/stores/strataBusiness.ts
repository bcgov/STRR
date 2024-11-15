export const useStrrStrataBusinessStore = defineStore('strr/strataBusiness', () => {
  const { strrBusiness, getBaseBusinessSchema } = useStrrBaseBusiness()

  const getBusinessSchema = () => getBaseBusinessSchema(strataBusiness.value)

  const strataBusiness = ref<StrrBusiness>({ ...strrBusiness.value })

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
    strataBusiness.value = { ...strrBusiness.value }
  }

  return {
    strataBusiness,
    getBusinessSchema,
    validateStrataBusiness,
    $reset
  }
})
