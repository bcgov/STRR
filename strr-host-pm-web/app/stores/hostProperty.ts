import { z } from 'zod'
import { RentalUnitSetupType } from '~/enums/rental-unit-setup-types'
import type { UiHostProperty } from '~/interfaces/host-ui'

export const useHostPropertyStore = defineStore('host/property', () => {
  const { t } = useI18n()

  const rentalAddressSchema = computed(() => z.object({
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

  const blSchema = z.object({
    businessLicense: optionalOrEmptyString,
    businessLicenseExpiryDate: property.value.businessLicense
      ? getRequiredNonEmptyString(t('validation.businessLicenseExpiryDate'))
      : optionalOrEmptyString
  })

  const unitDetailsSchema = computed(() => z.object({
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
    ownershipType: z.enum([OwnwershipType.CO_OWN, OwnwershipType.OWN, OwnwershipType.RENT], {
      errorMap: () => ({ message: t('validation.ownershipType') })
    }),
    rentalUnitSetupType: z.enum([
      RentalUnitSetupType.ROOM_IN_PRINCIPAL_RESIDENCE,
      RentalUnitSetupType.WHOLE_PRINCIPAL_RESIDENCE,
      RentalUnitSetupType.WHOLE_UNIT_SAME_PROPERTY,
      RentalUnitSetupType.WHOLE_UNIT_DIFFERENT_PROPERTY
    ], {
      errorMap: () => ({ message: t('validation.rentalUnitSetupType') })
    }),
    numberOfRoomsForRent: z.number({ required_error: t('validation.numberOfRooms.empty') })
      .int({ message: t('validation.numberOfRooms.invalidInput') }).min(0)
  }))

  const getEmptyRentalAddress = () => ({
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

  const getEmptyProperty = (): UiHostProperty => ({
    parcelIdentifier: '',
    businessLicense: '',
    businessLicenseExpiryDate: '',
    propertyType: undefined,
    ownershipType: undefined,
    rentalUnitSetupType: undefined,
    numberOfRoomsForRent: undefined,
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
    },
    listingDetails: [{ url: '' }]
  })

  const rentalAddress = ref(getEmptyRentalAddress())
  const property = ref<UiHostProperty>(getEmptyProperty())
  const isUnitNumberRequired = computed(() => property.value.propertyType && [
    PropertyType.SECONDARY_SUITE,
    PropertyType.ACCESSORY_DWELLING,
    PropertyType.TOWN_HOME,
    PropertyType.CONDO_OR_APT,
    PropertyType.MULTI_UNIT_HOUSING,
    PropertyType.STRATA_HOTEL].includes(property.value.propertyType)
  )

  const propertyTypeFeeTriggers = computed(() => ({
    isWholeUnit: property.value.rentalUnitSetupType !== undefined && [
      RentalUnitSetupType.WHOLE_PRINCIPAL_RESIDENCE,
      RentalUnitSetupType.WHOLE_UNIT_SAME_PROPERTY,
      RentalUnitSetupType.WHOLE_UNIT_DIFFERENT_PROPERTY
    ].includes(property.value.rentalUnitSetupType),
    isUnitOnPrincipalResidenceProperty: property.value.rentalUnitSetupType !== undefined && [
      RentalUnitSetupType.ROOM_IN_PRINCIPAL_RESIDENCE,
      RentalUnitSetupType.WHOLE_PRINCIPAL_RESIDENCE,
      RentalUnitSetupType.WHOLE_UNIT_SAME_PROPERTY
    ].includes(property.value.rentalUnitSetupType),
    isHostResidence: property.value.rentalUnitSetupType !== undefined && [
      RentalUnitSetupType.WHOLE_PRINCIPAL_RESIDENCE,
      RentalUnitSetupType.ROOM_IN_PRINCIPAL_RESIDENCE,
      RentalUnitSetupType.WHOLE_UNIT_SAME_PROPERTY
    ].includes(property.value.rentalUnitSetupType)
  }))

  const removeListingAtIndex = (index: number) => {
    property.value.listingDetails.splice(index, 1)
  }

  const addNewEmptyListing = () => {
    property.value.listingDetails.push({ url: '' })
  }

  const validateRentalAddress = (returnBool = false): MultiFormValidationResult | boolean => {
    const result = validateSchemaAgainstState(
      rentalAddressSchema.value,
      rentalAddress.value,
      'rental-address-form')

    if (returnBool) {
      return result.success === true
    } else {
      return [result]
    }
  }

  const validateBusinessLicence = (returnBool = false): MultiFormValidationResult | boolean => {
    const result = validateSchemaAgainstState(
      rentalAddressSchema.value,
      rentalAddress.value,
      'rental-address-form')

    if (returnBool) {
      return result.success === true
    } else {
      return [result]
    }
  }
  const validateUnitDetails = (returnBool = false): MultiFormValidationResult | boolean => {
    const result = validateSchemaAgainstState(
      rentalAddressSchema.value,
      rentalAddress.value,
      'rental-address-form')

    if (returnBool) {
      return result.success === true
    } else {
      return [result]
    }
  }

  const $reset = () => {
    property.value = getEmptyProperty()
  }

  return {
    property,
    rentalAddress,
    isUnitNumberRequired,
    rentalAddressSchema,
    propertySchema,
    propertyTypeFeeTriggers,
    addNewEmptyListing,
    removeListingAtIndex,
    validateProperty,
    $reset
  }
})
