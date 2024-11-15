import { z } from 'zod'

export const useStrrPlatformBusiness = defineStore('strr/platformBusiness', () => {
  const { t } = useI18n()
  const {
    strrBusiness: platformBusiness,
    isMailingInBC,
    getBaseBusinessSchema,
    getEmptyBusiness
  } = useStrrBaseBusiness<PlatBusiness>()

  const getEmptyPlatBusFields = () => ({
    hasCpbc: undefined,
    cpbcLicenceNumber: '',
    nonComplianceEmail: '',
    nonComplianceEmailOptional: '',
    takeDownEmail: '',
    takeDownEmailOptional: ''
  })

  platformBusiness.value = {
    ...getEmptyBusiness(),
    ...getEmptyPlatBusFields()
  }

  const getBusinessSchema = () => {
    if (!platformBusiness.value) {
      return undefined
    }
    return getBaseBusinessSchema()?.extend({
      hasCpbc: z.boolean(),
      cpbcLicenceNumber: platformBusiness.value.hasCpbc
        ? getRequiredNonEmptyString(t('validation.business.cpbc'))
        : optionalOrEmptyString,
      nonComplianceEmail: getRequiredEmail(t('validation.email')),
      nonComplianceEmailOptional: getOptionalEmail(t('validation.email')),
      takeDownEmail: getRequiredEmail(t('validation.email')),
      takeDownEmailOptional: getOptionalEmail(t('validation.email'))
    })
  }

  const validatePlatformBusiness = (returnBool = false): MultiFormValidationResult | boolean => {
    const schema = getBusinessSchema()
    if (!schema) {
      return false
    }
    const result = validateSchemaAgainstState(schema, platformBusiness.value, 'business-details-form')

    if (returnBool) {
      return result.success === true
    } else {
      return [result]
    }
  }

  const $reset = () => {
    platformBusiness.value = {
      ...getEmptyBusiness(),
      ...getEmptyPlatBusFields()
    }
  }

  return {
    platformBusiness,
    isMailingInBC,
    getBusinessSchema,
    validatePlatformBusiness,
    $reset
  }
})
