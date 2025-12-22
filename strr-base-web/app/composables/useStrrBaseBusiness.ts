import { z } from 'zod'

export const useStrrBaseBusiness = <T extends StrrBusiness>() => {
  const { t } = useNuxtApp().$i18n
  const getBaseBusinessSchema = () => {
    return z.object({
      legalName: getRequiredNonEmptyString(t('validation.business.legalName')),
      homeJurisdiction: optionalOrEmptyString,
      businessNumber: getOptionalBn15(t('validation.business.bn15')),
      mailingAddress: getRequiredAddress(
        t('validation.address.street'),
        t('validation.address.city'),
        t('validation.address.region'),
        t('validation.address.postalCode'),
        t('validation.address.country')
      ),
      hasRegOffAtt: z.boolean(),
      regOfficeOrAtt: strrBusiness.value.hasRegOffAtt
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

  const getEmptyBusiness = () => ({
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

  const strrBusiness = ref<T>(getEmptyBusiness() as T)

  const isMailingInBC = computed(() => {
    const isCA = strrBusiness.value.mailingAddress.country === 'CA'
    const isBC = strrBusiness.value.mailingAddress.region === 'BC'
    return isCA && isBC
  })

  // set regOfficeOrAtt.mailingAddress to match business mailing address if sameAsMailAddress checkbox checked
  watch(() => strrBusiness.value.regOfficeOrAtt.sameAsMailAddress,
    (newVal) => {
      if (newVal && isMailingInBC.value) {
        strrBusiness.value.regOfficeOrAtt.mailingAddress = { ...strrBusiness.value.mailingAddress }
      }
    }
  )

  watch(() => strrBusiness.value.mailingAddress,
    (newAddr) => {
      if (!isMailingInBC.value) {
        strrBusiness.value.regOfficeOrAtt.sameAsMailAddress = false
      }
      if (newAddr && strrBusiness.value.regOfficeOrAtt.sameAsMailAddress) {
        strrBusiness.value.regOfficeOrAtt.mailingAddress = { ...newAddr }
      }
    },
    { deep: true }
  )

  watch(() => strrBusiness.value.hasRegOffAtt,
    (newVal) => {
      // reset regOfficeOrAtt if hasRegOffAtt radio set to false
      if (!newVal) {
        strrBusiness.value.regOfficeOrAtt.attorneyName = ''
        strrBusiness.value.regOfficeOrAtt.sameAsMailAddress = false
        Object.keys(strrBusiness.value.regOfficeOrAtt.mailingAddress).forEach((key) => {
          // @ts-expect-error - ts doesnt recognize key type
          strrBusiness.value.regOfficeOrAtt.mailingAddress[key] = ''
        })
      } else {
        strrBusiness.value.regOfficeOrAtt.mailingAddress.country = 'CA'
        strrBusiness.value.regOfficeOrAtt.mailingAddress.region = 'BC'
      }
    }
  )

  return {
    strrBusiness,
    isMailingInBC,
    getBaseBusinessSchema,
    getEmptyBusiness
  }
}
