import { z } from 'zod'

// TODO: add validate functions to stepper
export const useHostPropertyStore = defineStore('host/property', () => {
  const { t } = useI18n()

  // rental unit address stuff
  const unitAddressSchema = computed(() => z.object({
    address: getRequiredBCAddressSplitStreet(
      t('validation.address.city'),
      t('validation.address.region'),
      t('validation.address.postalCode'),
      t('validation.address.country'),
      t('validation.address.requiredBC.region'),
      t('validation.address.requiredBC.country'),
      t('validation.address.streetName'),
      t('validation.address.streetNumber')
    ).extend({
      unitNumber: isUnitNumberRequired.value
        ? getRequiredNonEmptyString(t('validation.address.unitNumber'))
        : optionalOrEmptyString,
      nickname: optionalOrEmptyString
    })
  }))

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
      unitAddressSchema.value,
      unitAddress.value,
      'rental-unit-address-form'
    )

    if (returnBool) {
      return result.success === true
    } else {
      return [result]
    }
  }

  // business licence stuff
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
      }, { message: 'The expiry date must be greater than today and in less than 1 year.' })
  })

  const getEmptyBlInfo = (): UiBlInfo => ({
    businessLicense: '',
    businessLicenseExpiryDate: ''
  })

  const blInfo = ref<UiBlInfo>(getEmptyBlInfo())

  const validateBusinessLicence = (returnBool = false): MultiFormValidationResult | boolean => {
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
    numberOfRoomsForRent: z.number({ required_error: t('validation.numberOfRooms.empty') })
      .int({ message: t('validation.numberOfRooms.invalidInput') }).min(0)
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

  const $reset = () => {
    unitAddress.value = getEmptyUnitAddress()
    unitDetails.value = getEmptyUnitDetails()
    blInfo.value = getEmptyBlInfo()
  }

  return {
    unitAddressSchema,
    getEmptyUnitAddress,
    unitAddress,
    validateUnitAddress,
    minBlDate,
    maxBlDate,
    blInfoSchema,
    getEmptyBlInfo,
    blInfo,
    validateBusinessLicence,
    // unitDetailsSchema,
    getUnitDetailsSchema,
    getEmptyUnitDetails,
    unitDetails,
    validateUnitDetails,
    isUnitNumberRequired,
    isPIDRequired,
    propertyTypeFeeTriggers,
    $reset
  }
})
