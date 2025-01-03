import { z } from 'zod'

export const useHostPropertyStore = defineStore('host/property', () => {
  const { t } = useI18n()

  // rental unit address stuff
  const useManualAddressInput = ref<boolean>(false)

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

  const blInfoSchema = z.object({
    businessLicense: z.string().optional(),
    businessLicenseExpiryDate: z
      .string()
      .refine((val) => {
        if (!val) { return true } // optional
        const date = new Date(val)
        return date > today && date <= maxBlDate
      }, { message: t('validation.blExpiryDate') })
  })

  const getEmptyBlInfo = (): UiBlInfo => ({
    businessLicense: '',
    businessLicenseExpiryDate: ''
  })

  const blInfo = ref<UiBlInfo>(getEmptyBlInfo())

  const validateBusinessLicense = (returnBool = false): MultiFormValidationResult | boolean => {
    const result = validateSchemaAgainstState(
      blInfoSchema,
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
    parcelIdentifier: isPIDRequired.value
      ? getRequiredPID(t('validation.parcelIdentifier'))
      : getOptionalPID(t('validation.parcelIdentifier')),
    // parcelIdentifier: getRequiredPID(t('validation.parcelIdentifier')),
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

  const getEmptyUnitDetails = (): UiUnitDetails => ({
    parcelIdentifier: '',
    propertyType: undefined,
    ownershipType: undefined,
    rentalUnitSetupType: undefined,
    typeOfSpace: undefined,
    numberOfRoomsForRent: 0
  })

  const unitDetails = ref<UiUnitDetails>(getEmptyUnitDetails())

  const validateUnitDetails = (returnBool = false): MultiFormValidationResult | boolean => {
    const result = validateSchemaAgainstState(
      getUnitDetailsSchema(),
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

  const isPIDRequired = computed(() => unitDetails.value.ownershipType && [
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
    isSharedAccommodation: unitDetails.value.typeOfSpace === RentalUnitType.SHARED_ACCOMMODATION
  }))

  const resetUnitAddress = () => {
    unitAddress.value = getEmptyUnitAddress()
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
    getEmptyUnitDetails,
    unitDetails,
    validateUnitDetails,
    isUnitNumberRequired,
    isPIDRequired,
    propertyTypeFeeTriggers,
    useManualAddressInput,
    resetUnitAddress,
    resetUnitDetails,
    resetBlInfo,
    $reset
  }
})
