import { z } from 'zod'
import {
  getOptionalEmail, getRequiredEmail, getRequiredNonEmptyString, optionalOrEmptyString
} from '~/utils/connect-validation'

export const useStrrPlatformBusiness = defineStore('strr/platformBusiness', () => {
  const { t } = useI18n()
  const { strrBusiness, getBaseBusinessSchema } = useStrrBaseBusiness()

  const getBusinessSchema = () => {
    return getBaseBusinessSchema(platformBusiness.value).extend({
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

  const platformBusiness = ref<PlatBusiness>({
    ...strrBusiness.value,
    hasCpbc: undefined,
    cpbcLicenceNumber: '',
    nonComplianceEmail: '',
    nonComplianceEmailOptional: '',
    takeDownEmail: '',
    takeDownEmailOptional: ''
  })

  const validatePlatformBusiness = (returnBool = false): MultiFormValidationResult | boolean => {
    const schema = getBusinessSchema()
    const result = validateSchemaAgainstState(schema, platformBusiness.value, 'business-details-form')

    if (returnBool) {
      return result.success === true
    } else {
      return [result]
    }
  }

  return {
    platformBusiness,
    getBusinessSchema,
    validatePlatformBusiness
  }
})
