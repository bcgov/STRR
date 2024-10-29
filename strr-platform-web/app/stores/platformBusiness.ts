import { z } from 'zod'
import {
  getOptionalEmail, getRequiredAddress, getRequiredEmail, getRequiredNonEmptyString, optionalOrEmptyString
} from '~/utils/connect-validation'

export const useStrrPlatformBusiness = defineStore('strr/platformBusiness', () => {
  const { t } = useI18n()
  const getBusinessSchema = () => {
    return z.object({
      legalName: getRequiredNonEmptyString(t('validation.business.legalName')),
      homeJurisdiction: getRequiredNonEmptyString(t('validation.business.jurisdiction')),
      businessNumber: optionalOrEmptyString,
      hasCpbc: z.boolean(),
      cpbcLicenceNumber: platformBusiness.value.hasCpbc
        ? getRequiredNonEmptyString(t('validation.business.cpbc'))
        : optionalOrEmptyString,
      nonComplianceEmail: getRequiredEmail(t('validation.email')),
      nonComplianceEmailOptional: getOptionalEmail(t('validation.email')),
      takeDownEmail: getRequiredEmail(t('validation.email')),
      takeDownEmailOptional: getOptionalEmail(t('validation.email')),
      mailingAddress: getRequiredAddress(
        t('validation.address.street'),
        t('validation.address.city'),
        t('validation.address.region'),
        t('validation.address.postalCode'),
        t('validation.address.country')
      ),
      hasRegOffAtt: z.boolean(),
      regOfficeOrAtt: platformBusiness.value.hasRegOffAtt
        ? z.object({
          attorneyName: optionalOrEmptyString,
          sameAsMailAddress: z.boolean(),
          mailingAddress: getRequiredAddress(
            t('validation.address.street'),
            t('validation.address.city'),
            t('validation.address.region'),
            t('validation.address.postalCode'),
            t('validation.address.country')
          )
        })
        : z.object({}).optional()
    })
  }

  const platformBusiness = ref<PlatBusiness>({
    legalName: '',
    homeJurisdiction: '',
    businessNumber: '',
    hasCpbc: undefined,
    cpbcLicenceNumber: '',
    nonComplianceEmail: '',
    nonComplianceEmailOptional: '',
    takeDownEmail: '',
    takeDownEmailOptional: '',
    mailingAddress: {
      street: '',
      streetAdditional: '',
      region: '',
      city: '',
      country: '',
      postalCode: '',
      locationDescription: ''
    },
    hasRegOffAtt: undefined,
    regOfficeOrAtt: {
      attorneyName: '',
      sameAsMailAddress: false,
      mailingAddress: {
        street: '',
        streetAdditional: '',
        region: '',
        city: '',
        country: '',
        postalCode: '',
        locationDescription: ''
      }
    }
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
    // businessDetailsSchema,
    getBusinessSchema,
    validatePlatformBusiness
  }
})
