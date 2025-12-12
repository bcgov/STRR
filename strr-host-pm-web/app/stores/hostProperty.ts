import { z } from 'zod'

export const useHostPropertyStore = defineStore('host/property', () => {
  const { t } = useI18n()
  const { isNewRentalUnitSetupEnabled } = useHostFeatureFlags()
  const propertyReqStore = usePropertyReqStore()

  // rental unit address stuff
  const useManualAddressInput = ref<boolean>(false)
  const hasNoStreetAddress = ref<boolean>(false)

  const streetNumberRegex = /^\d{1,6}(?:[A-Za-z]| 1\/2)?$/
  const unitNumberRegex = /^[A-Za-z0-9]+$/ // only alphanumeric unit numbers (letters and numbers)

  const getUnitAddressSchema = () => z.object({
    address: z.object({
      street:
        useManualAddressInput.value
          ? optionalOrEmptyString
          : z.string().min(1, t('validation.residentialAddressRequired')),
      streetAdditional: optionalOrEmptyString,
      city: getRequiredNonEmptyString(t('validation.address.city')),
      region: getRequiredNonEmptyString(t('validation.address.region')),
      postalCode: getRequiredNonEmptyString(t('validation.address.postalCode')),
      country: getRequiredNonEmptyString(t('validation.address.country')),
      locationDescription: optionalOrEmptyString,
      streetName: unitAddress.value.address.streetAdditional === ''
        ? getRequiredNonEmptyString(t('validation.address.streetName'))
        : optionalOrEmptyString,
      streetNumber: unitAddress.value.address.streetAdditional === ''
        ? getRequiredNonEmptyString(t('validation.address.streetNumber'))
        : optionalOrEmptyString,
      unitNumber: optionalOrEmptyString,
      nickname: optionalOrEmptyString
    }).superRefine((data, ctx) => {
      const { city, postalCode, streetName, streetNumber } = data

      // when using auto complete, show error unless autocomplete address selected, no partial strings/addresses
      if (!useManualAddressInput.value) {
        if (!city || !postalCode || !streetName || !streetNumber) {
          ctx.addIssue({
            code: 'custom',
            path: ['street'],
            message: t('validation.addressIncompleteDropdown')
          })
        }
      }
    })
  })

  // validation schema for update manual address input fields
  const getUnitAddressSchema2 = () => z.object({
    address: z.object({
      streetNumber: unitAddress.value.address.streetAdditional === ''
        ? z
          .string()
          .min(1, { message: t('validation.addressForm.streetNumber') })
          .max(10, { message: t('validation.addressForm.streetNumberInvalid') })
          .refine(val => val === '' || streetNumberRegex.test(val),
            { message: t('validation.addressForm.streetNumberInvalid') })
        : optionalOrEmptyString,
      streetName: unitAddress.value.address.streetAdditional === ''
        ? z
          .string()
          .min(2, { message: t('validation.addressForm.streetName') })
          .max(50, { message: t('validation.maxChars', { maxLen: 50 }) })
        : optionalOrEmptyString,
      street:
        useManualAddressInput.value
          ? optionalOrEmptyString
          : z.string().min(2, t('validation.residentialAddressRequired')),
      streetAdditional: useManualAddressInput.value && hasNoStreetAddress.value
        ? z
          .string()
          .min(1, { message: t('validation.addressForm.siteName') })
          .min(2, { message: t('validation.addressForm.siteNameInvalid') })
          .max(150, { message: t('validation.maxChars', { maxLen: 150 }) })
        : optionalOrEmptyString,
      unitNumber: z
        .string()
        .max(6, { message: t('validation.maxChars', { maxLen: 6 }) })
        .optional()
        .refine(val => val === '' || unitNumberRegex.test(val),
          { message: t('validation.addressForm.unitNumberInvalid') }),
      city: z
        .string()
        .min(2, { message: t('validation.addressForm.city') })
        .max(100, { message: t('validation.maxChars', { maxLen: 100 }) }),
      region: getRequiredNonEmptyString(t('validation.address.region')),
      postalCode: z
        .string()
        .min(1, { message: t('validation.addressForm.postalCode') })
        .length(7, { message: t('validation.addressForm.postalCodeInvalid') }),
      locationDescription: z
        .string()
        .max(400, { message: t('validation.maxChars', { maxLen: 400 }) })
        .optional(),
      nickname: optionalOrEmptyString,
      country: getRequiredNonEmptyString(t('validation.address.country'))
    }).superRefine((data, ctx) => {
      const { city, postalCode, streetName, streetNumber } = data

      // when using auto complete, show error unless autocomplete address selected, no partial strings/addresses
      if (!useManualAddressInput.value) {
        if (!city || !postalCode || !streetName || !streetNumber) {
          ctx.addIssue({
            code: 'custom',
            path: ['street'],
            message: t('validation.addressIncompleteDropdown')
          })
        }
      }
    })
  })

  const getEmptyUnitAddress = (): { address: HostPropertyAddress } => ({
    address: {
      street: '',
      streetNumber: '',
      streetName: '',
      unitNumber: '',
      streetAdditional: '',
      region: 'BC',
      city: '',
      country: 'CA',
      postalCode: '',
      locationDescription: '',
      nickname: ''
    }
  })

  const unitAddress = ref<{ address: HostPropertyAddress }>(getEmptyUnitAddress())

  const validateUnitAddress = (returnBool = false): MultiFormValidationResult | boolean => {
    const result = validateSchemaAgainstState(
      getUnitAddressSchema(),
      unitAddress.value,
      'rental-unit-address-form'
    )

    if (returnBool) {
      return result.success === true
    } else {
      return [result]
    }
  }

  // business license stuff
  const today = new Date()
  const minBlDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1) // tomorrow
  const maxBlDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()) // today + 1 year

  const blInfoSchema = computed(() => z.object({
    businessLicense: z.string().optional(),
    businessLicenseExpiryDate: propertyReqStore.blRequirements.isBusinessLicenceExempt
      ? z.string().optional()
      : z.string().refine((val) => {
        if (!val) { return true } // optional
        const date = new Date(val)
        return date > today && date <= maxBlDate
      }, { message: t('validation.blExpiryDate') })
  }))

  const getEmptyBlInfo = (): UiBlInfo => ({
    businessLicense: '',
    businessLicenseExpiryDate: ''
  })

  const blInfo = ref<UiBlInfo>(getEmptyBlInfo())

  const validateBusinessLicense = (returnBool = false): MultiFormValidationResult | boolean => {
    const result = validateSchemaAgainstState(
      blInfoSchema.value,
      blInfo.value,
      'business-license-form'
    )

    if (returnBool) {
      return result.success === true
    } else {
      return [result]
    }
  }

  // unit details stuff
  const getUnitDetailsSchema = () => z.object({
    parcelIdentifier: getOptionalPID(t('validation.parcelIdentifier')),
    propertyType: z.enum([
      PropertyType.ACCESSORY_DWELLING,
      PropertyType.BED_AND_BREAKFAST,
      PropertyType.CONDO_OR_APT,
      PropertyType.FLOAT_HOME,
      PropertyType.MULTI_UNIT_HOUSING,
      PropertyType.RECREATIONAL,
      PropertyType.SECONDARY_SUITE,
      PropertyType.SINGLE_FAMILY_HOME,
      PropertyType.STRATA_HOTEL,
      PropertyType.TOWN_HOME
    ], {
      errorMap: () => ({ message: t('validation.propertyType') })
    }),
    ownershipType: z.enum([OwnershipType.CO_OWN, OwnershipType.OWN, OwnershipType.RENT, OwnershipType.OTHER], {
      errorMap: () => ({ message: t('validation.ownershipType') })
    }),
    typeOfSpace: z.enum([RentalUnitType.ENTIRE_HOME, RentalUnitType.SHARED_ACCOMMODATION], {
      errorMap: () => ({ message: t('validation.typeOfSpace') })
    }),
    rentalUnitSetupType: z.enum([
      RentalUnitSetupType.WHOLE_PRINCIPAL_RESIDENCE,
      RentalUnitSetupType.UNIT_ON_PR_PROPERTY,
      RentalUnitSetupType.UNIT_NOT_ON_PR_PROPERTY
    ], {
      errorMap: () => ({ message: t('validation.rentalUnitSetupType') })
    }),
    numberOfRoomsForRent: z
      .number({
        required_error: t('validation.numberOfRooms.empty'),
        invalid_type_error: t('validation.numberOfRooms.invalidInput')
      })
      .int({ message: t('validation.numberOfRooms.invalidInput') })
      .min(0)
      .max(5000)
  })

  // validation schema for new property setup - enabled by feature flag isNewRentalUnitSetupEnabled
  const getUnitDetailsSchema2 = () => z.object({
    propertyType: z.enum([
      PropertyType.SINGLE_FAMILY_HOME,
      PropertyType.SECONDARY_SUITE,
      PropertyType.ACCESSORY_DWELLING,
      PropertyType.MULTI_UNIT_HOUSING,
      PropertyType.BED_AND_BREAKFAST,
      PropertyType.FLOAT_HOME,
      PropertyType.STRATA_HOTEL
    ], {
      errorMap: () => ({ message: t('validation.strPropertyType') })
    }),
    hostType: z.enum([
      PropertyHostType.OWNER,
      PropertyHostType.FRIEND_RELATIVE,
      PropertyHostType.LONG_TERM_TENANT
    ], {
      errorMap: () => ({ message: t('validation.hostType') })
    }),
    rentalUnitSetupOption: z.enum([
      RentalUnitSetupOption.DIFFERENT_PROPERTY,
      RentalUnitSetupOption.SEPARATE_UNIT_SAME_PROPERTY,
      RentalUnitSetupOption.PRIMARY_RESIDENCE_OR_SHARED_SPACE
    ], {
      errorMap: () => ({ message: t('validation.rentalUnitSetupOption') })
    })
  })

  const getEmptyUnitDetails = (): UiUnitDetails => ({
    parcelIdentifier: '',
    propertyType: undefined,
    ownershipType: undefined,
    rentalUnitSetupType: undefined,
    typeOfSpace: undefined,
    numberOfRoomsForRent: 0,
    // fields for new form
    hostType: undefined,
    rentalUnitSetupOption: undefined
  })

  const unitDetails = ref<UiUnitDetails>(getEmptyUnitDetails())

  const validateUnitDetails = (returnBool = false): MultiFormValidationResult | boolean => {
    const schemaToValidate = isNewRentalUnitSetupEnabled.value ? getUnitDetailsSchema2() : getUnitDetailsSchema()

    const result = validateSchemaAgainstState(
      schemaToValidate,
      unitDetails.value,
      'unit-details-form')

    if (returnBool) {
      return result.success === true
    } else {
      return [result]
    }
  }

  const isUnitNumberRequired = computed(() => unitDetails.value.propertyType && [
    PropertyType.SECONDARY_SUITE,
    PropertyType.ACCESSORY_DWELLING,
    PropertyType.TOWN_HOME,
    PropertyType.CONDO_OR_APT,
    PropertyType.MULTI_UNIT_HOUSING,
    PropertyType.STRATA_HOTEL].includes(unitDetails.value.propertyType)
  )

  const isOwnerOrCoOwner = computed(() => unitDetails.value.ownershipType && [
    OwnershipType.OWN,
    OwnershipType.CO_OWN
  ].includes(unitDetails.value.ownershipType))

  const propertyTypeFeeTriggers = computed(() => ({
    isEntireHomeAndPrincipalResidence:
      unitDetails.value.typeOfSpace === RentalUnitType.ENTIRE_HOME &&
      unitDetails.value.rentalUnitSetupType === RentalUnitSetupType.WHOLE_PRINCIPAL_RESIDENCE,
    isEntireHomeAndNotPrincipalResidence:
      unitDetails.value.typeOfSpace === RentalUnitType.ENTIRE_HOME &&
      unitDetails.value.rentalUnitSetupType !== RentalUnitSetupType.WHOLE_PRINCIPAL_RESIDENCE,
    isSharedAccommodation: unitDetails.value.typeOfSpace === RentalUnitType.SHARED_ACCOMMODATION,
    isBBorRecProperty: unitDetails.value.propertyType &&
      [PropertyType.BED_AND_BREAKFAST, PropertyType.RECREATIONAL].includes(unitDetails.value.propertyType)
  }))

  const resetUnitAddress = (preserveNickname = false) => {
    const nickname = unitAddress.value.address.nickname
    unitAddress.value = getEmptyUnitAddress()
    if (preserveNickname) {
      unitAddress.value.address.nickname = nickname
    }
  }

  const resetUnitDetails = () => {
    unitDetails.value = getEmptyUnitDetails()
  }

  const resetBlInfo = () => {
    blInfo.value = getEmptyBlInfo()
  }

  const $reset = () => {
    resetUnitAddress()
    resetUnitDetails()
    resetBlInfo()
    useManualAddressInput.value = false
  }

  return {
    getUnitAddressSchema,
    getUnitAddressSchema2,
    getEmptyUnitAddress,
    unitAddress,
    validateUnitAddress,
    minBlDate,
    maxBlDate,
    blInfoSchema,
    getEmptyBlInfo,
    blInfo,
    validateBusinessLicense,
    // unitDetailsSchema,
    getUnitDetailsSchema,
    getUnitDetailsSchema2,
    getEmptyUnitDetails,
    unitDetails,
    validateUnitDetails,
    isUnitNumberRequired,
    isOwnerOrCoOwner,
    propertyTypeFeeTriggers,
    useManualAddressInput,
    hasNoStreetAddress,
    resetUnitAddress,
    resetUnitDetails,
    resetBlInfo,
    $reset
  }
})
