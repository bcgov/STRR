import { z } from 'zod'

export const useStrrPlatformBusiness = defineStore('strr/platformBusiness', () => {
  const { t } = useNuxtApp().$i18n
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

  // add extra platform details to default business
  platformBusiness.value = {
    ...platformBusiness.value,
    ...getEmptyPlatBusFields()
  }

  const getBusinessSchema = () => {
    return getBaseBusinessSchema().extend({
      hasCpbc: z.boolean(),
      cpbcLicenceNumber: platformBusiness.value.hasCpbc
        ? z.string()
          .regex(/^\d+$/, { message: t('validation.business.cpbc') })
          .min(5, { message: t('validation.business.cpbc') })
          .max(6, { message: t('validation.business.cpbc') })
        : optionalOrEmptyString,
      nonComplianceEmail: getRequiredEmail(t('validation.email')),
      nonComplianceEmailOptional: getOptionalEmail(t('validation.email')),
      takeDownEmail: getRequiredEmail(t('validation.email')),
      takeDownEmailOptional: getOptionalEmail(t('validation.email'))
    })
  }

  const validatePlatformBusiness = (returnBool = false): MultiFormValidationResult | boolean => {
    const schema = getBusinessSchema()
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
