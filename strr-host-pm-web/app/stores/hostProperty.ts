import { z } from 'zod'
import { getRequiredUrl } from '#imports'

export const useHostPropertyStore = defineStore('host/property', () => {
  const { t } = useI18n()

  const propertySchema = computed(() => z.object({
    parcelIdentifier: getOptionalPID(t('validation.parcelIdentifier')),
    businessLicense: optionalOrEmptyString,
    businessLicenseExpiryDate: property.value.businessLicense
      ? getRequiredNonEmptyString(t('validation.businessLicenseExpiryDate'))
      : optionalOrEmptyString,
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
    rentalUnitSpaceType: z.enum([RentalUnitType.ENTIRE_HOME, RentalUnitType.SHARED_ACCOMMODATION]),
    isUnitOnPrincipalResidenceProperty: z.boolean(),
    hostResidence: z.enum([ResidenceType.ANOTHER_UNIT, ResidenceType.SAME_UNIT]),
    numberOfRoomsForRent: z.number({ required_error: t('validation.numberOfRooms.empty') })
      .int({ message: t('validation.numberOfRooms.invalidInput') }).min(0),
    // TODO: update for street number/name/unit number
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
    }),
    listingDetails: z.array(z.object({ url: getRequiredUrl(t('validation.listingDetails')) }))
  }))

  const getEmptyProperty = () => ({
    parcelIdentifier: '',
    businessLicense: '',
    businessLicenseExpiryDate: '',
    propertyType: undefined,
    ownershipType: undefined,
    rentalUnitSpaceType: undefined,
    hostResidence: undefined,
    isUnitOnPrincipalResidenceProperty: undefined,
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

  const property = ref<HostProperty>(getEmptyProperty())
  const isUnitNumberRequired = computed(() => property.value.propertyType && [
    PropertyType.SECONDARY_SUITE,
    PropertyType.ACCESSORY_DWELLING,
    PropertyType.TOWN_HOME,
    PropertyType.CONDO_OR_APT,
    PropertyType.MULTI_UNIT_HOUSING,
    PropertyType.STRATA_HOTEL].includes(property.value.propertyType)
  )

  const removeListingAtIndex = (index: number) => {
    property.value.listingDetails.splice(index, 1)
  }

  const addNewEmptyListing = () => {
    property.value.listingDetails.push({ url: '' })
  }

  const validateProperty = (returnBool = false): MultiFormValidationResult | boolean => {
    const result = validateSchemaAgainstState(
      propertySchema.value,
      property.value,
      'property-form')

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
    isUnitNumberRequired,
    propertySchema,
    addNewEmptyListing,
    removeListingAtIndex,
    validateProperty,
    $reset
  }
})
