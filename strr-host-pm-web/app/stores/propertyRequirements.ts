import { z } from 'zod'
import { FetchError } from 'ofetch'
import type { BusinessLicenceRequirements } from '~/interfaces/business-licence-requirements'

export const usePropertyReqStore = defineStore('property/requirements', () => {
  const { t } = useI18n()
  const { $strrApi } = useNuxtApp()

  const propStore = useHostPropertyStore()

  const loadingReqs = ref<boolean>(false)
  const propertyReqs = ref<PropertyRequirements>({} as PropertyRequirements)
  const propertyReqError = ref<PropertyRequirementsError>({} as PropertyRequirementsError)
  const overrideApplicationWarning = ref<boolean>(false)
  const showUnitDetailsForm = ref<boolean>(false)

  const hasReqs = computed(() => propertyReqs.value.organizationNm !== undefined) // TODO: confirm this will never be undefined in a response?
  const hasReqError = computed(() => propertyReqError.value.type !== undefined)

  const requirementsList = computed(() => {
    const reqs = []
    // TODO: need to define rules for when to display what information if user continues with application
    // || overrideApplicationWarning.value === true
    if (propertyReqs.value.isBusinessLicenceRequired || overrideApplicationWarning.value) {
      reqs.push(
        {
          label: t('requirements.busLicense.label'),
          id: 'bl-requirement',
          content: overrideApplicationWarning.value
            ? t('requirements.busLicense.content.override')
            : t('requirements.busLicense.content.normal')
        }
      )
    }
    if (propertyReqs.value.isPrincipalResidenceRequired || overrideApplicationWarning.value === true) {
      reqs.push({ label: t('requirements.pr.label'), slot: 'pr' })
    }
    return reqs
  })

  // pr requirements/exemption stuff
  const prRequirementsSchema = computed(() => z.object({
    isPropertyPrExempt: z.boolean(),
    prExemptionReason: prRequirements.value.isPropertyPrExempt
      ? z.enum([
        PrExemptionReason.STRATA_HOTEL,
        PrExemptionReason.FARM_LAND,
        PrExemptionReason.FRACTIONAL_OWNERSHIP
      ])
      : z.any().optional()
  }))

  // business licence requirements when bl not required option is selected
  const blRequirementsSchema = computed(() => z.object({
    isBusinessLicenceExempt: z.boolean(),
    blExemptReason: blRequirements.value.isBusinessLicenceExempt
      ? z.string()
        .min(1, { message: t('validation.required') })
      : z.any().optional()
  }))

  const getEmptyPrRequirements = (): PrRequirements => ({
    isPropertyPrExempt: false,
    prExemptionReason: undefined
  })

  const getEmptyBlRequirements = (): BusinessLicenceRequirements => ({
    isBusinessLicenceExempt: false,
    blExemptType: undefined,
    blExemptReason: ''
  })

  const prRequirements = ref<PrRequirements>(getEmptyPrRequirements())
  const blRequirements = ref<BusinessLicenceRequirements>(getEmptyBlRequirements())

  async function getPropertyReqs () {
    try {
      loadingReqs.value = true
      const res = await $strrApi<PropertyRequirements>('/address/requirements', {
        method: 'POST',
        body: {
          address: {
            unitNumber: propStore.unitAddress.address.unitNumber,
            streetNumber: propStore.unitAddress.address.streetNumber,
            streetName: propStore.unitAddress.address.streetName,
            addressLineTwo: propStore.unitAddress.address.streetAdditional,
            city: propStore.unitAddress.address.city,
            postalCode: propStore.unitAddress.address.postalCode,
            province: propStore.unitAddress.address.region,
            country: propStore.unitAddress.address.country,
            nickname: propStore.unitAddress.address.nickname
          }
        }
      })

      propertyReqs.value = res

      // TODO: confirm these are the only scenarios we want to open the form without further user interaction
      if (!res.isStrProhibited && !res.isStraaExempt) {
        showUnitDetailsForm.value = true
      }
    } catch (e) {
      logFetchError(e, 'Unable to load address requirements')
      if (e instanceof FetchError) {
        propertyReqError.value = { error: e, type: 'fetch' }
      } else {
        propertyReqError.value = { type: 'unknown' }
      }
    } finally {
      loadingReqs.value = false
    }
  }

  const $reset = () => {
    propertyReqs.value = {} as PropertyRequirements
    propertyReqError.value = {} as PropertyRequirementsError
    prRequirements.value = getEmptyPrRequirements()
    blRequirements.value = getEmptyBlRequirements()
    showUnitDetailsForm.value = false
    overrideApplicationWarning.value = false
  }

  return {
    loadingReqs,
    propertyReqs,
    hasReqs,
    hasReqError,
    propertyReqError,
    prRequirementsSchema,
    blRequirementsSchema,
    prRequirements,
    blRequirements,
    showUnitDetailsForm,
    requirementsList,
    overrideApplicationWarning,
    getPropertyReqs,
    $reset
  }
})
