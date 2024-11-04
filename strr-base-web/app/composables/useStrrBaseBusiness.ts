// TODO: move to strr-base-web layer
import { z } from 'zod'
import { getRequiredAddress, getRequiredNonEmptyString, optionalOrEmptyString } from '~/utils/connect-validation'

export const useStrrBaseBusiness = () => {
  const { t } = useI18n()
  const getBaseBusinessSchema = (business: StrrBusiness) => {
    return z.object({
      legalName: getRequiredNonEmptyString(t('validation.business.legalName')),
      homeJurisdiction: getRequiredNonEmptyString(t('validation.business.jurisdiction')),
      businessNumber: optionalOrEmptyString,
      mailingAddress: getRequiredAddress(
        t('validation.address.street'),
        t('validation.address.city'),
        t('validation.address.region'),
        t('validation.address.postalCode'),
        t('validation.address.country')
      ),
      hasRegOffAtt: z.boolean(),
      regOfficeOrAtt: business.hasRegOffAtt
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

  const strrBusiness = ref<StrrBusiness>({
    legalName: '',
    homeJurisdiction: '',
    businessNumber: '',
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

  return {
    strrBusiness,
    getBaseBusinessSchema
  }
}
