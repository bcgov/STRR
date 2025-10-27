import { z } from 'zod'
import { FetchError } from 'ofetch'
import type { BusinessLicenceRequirements } from '~/interfaces/business-licence-requirements'

export const usePropertyReqStore = defineStore('property/requirements', () => {
  const { t } = useI18n()
  const { $strrApi } = useNuxtApp()

  const propStore = useHostPropertyStore()
  const { isNewRentalUnitSetupEnabled } = useHostFeatureFlags()

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

  const strataHotelCategorySchema = computed(() => {
    const schema: any = {
      category: prRequirements.value.isPropertyPrExempt &&
            prRequirements.value.prExemptionReason === PrExemptionReason.STRATA_HOTEL
        ? z.enum([
          StrataHotelCategory.FULL_SERVICE,
          StrataHotelCategory.MULTI_UNIT_NON_PR,
          StrataHotelCategory.POST_DECEMBER_2023
        ], {
          errorMap: () => ({ message: t('validation.strataHotelCategory') })
        })
        : z.any().optional()
    }
    // additional validation for new rental unit setup
    if (isNewRentalUnitSetupEnabled.value) {
      schema.strataHotelRegistrationNumber = z
        .string({
          required_error: t('validation.strataHotelRegistrationNumber'),
          invalid_type_error: t('validation.strataHotelRegistrationNumber')
        })
        .length(11, { message: t('validation.strataHotelRegistrationNumber') })
        .refine(val => val === '' || /^ST\d{9}$/.test(val),
          { message: t('validation.strataHotelRegistrationNumber') })
    }
    return z.object(schema)
  })

  const getEmptyPrRequirements = (): PrRequirements => ({
    isPropertyPrExempt: false,
    prExemptionReason: undefined
  })

  const getEmptyBlRequirements = (): BusinessLicenceRequirements => ({
    isBusinessLicenceExempt: false,
    blExemptType: undefined,
    blExemptReason: ''
  })
  const getEmptyStrataHotelCategory = (): StrataHotelCategoriesAndPlatformNum => ({
    category: undefined,
    strataHotelRegistrationNumber: undefined
  })

  const prRequirements = ref<PrRequirements>(getEmptyPrRequirements())
  const blRequirements = ref<BusinessLicenceRequirements>(getEmptyBlRequirements())
  const strataHotelCategory = ref<StrataHotelCategoriesAndPlatformNum>(getEmptyStrataHotelCategory())

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

  const validateBlExemption = (returnBool = false): MultiFormValidationResult | boolean => {
    const blResult = validateSchemaAgainstState(
      blRequirementsSchema.value,
      blRequirements.value,
      'bl-requirements-form'
    )

    if (returnBool) {
      return blResult.success
    }
    return [blResult]
  }

  const validatePrRequirements = (returnBool = false): MultiFormValidationResult | boolean => {
    const prResult = validateSchemaAgainstState(
      prRequirementsSchema.value,
      prRequirements.value,
      'pr-requirements-form'
    )

    // Only validate strata hotel category if PR is exempt and reason is STRATA_HOTEL
    const shouldValidateStrataHotel = prRequirements.value.isPropertyPrExempt &&
      prRequirements.value.prExemptionReason === PrExemptionReason.STRATA_HOTEL

    if (shouldValidateStrataHotel) {
      const strataResult = validateSchemaAgainstState(
        strataHotelCategorySchema.value,
        strataHotelCategory.value,
        'strata-hotel-form'
      )

      if (returnBool) {
        return prResult.success && strataResult.success
      }
      return [prResult, strataResult]
    }

    if (returnBool) {
      return prResult.success
    }
    return [prResult]
  }

  const $reset = () => {
    propertyReqs.value = {} as PropertyRequirements
    propertyReqError.value = {} as PropertyRequirementsError
    prRequirements.value = getEmptyPrRequirements()
    blRequirements.value = getEmptyBlRequirements()
    strataHotelCategory.value = getEmptyStrataHotelCategory()
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
    strataHotelCategorySchema,
    strataHotelCategory,
    showUnitDetailsForm,
    requirementsList,
    overrideApplicationWarning,
    validateBlExemption,
    validatePrRequirements,
    getPropertyReqs,
    $reset
  }
})
