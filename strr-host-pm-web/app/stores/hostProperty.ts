import { z } from 'zod'
import type { HostProperty } from '~/interfaces/host-property'

export const useHostPropertyStore = defineStore('host/property', () => {
  const { t } = useI18n()

  const propertySchema = z.object({
    parcelIdentifier: getRequiredNonEmptyString(t('validation.parcelIdentifier')),
    businessLicense: getRequiredNonEmptyString(t('validation.businessLicense')),
    businessLicenseExpiryDate: getRequiredNonEmptyString(t('validation.businessLicenseExpiryDate')),
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
    ]),
    ownershipType: z.enum([OwnwershipType.CO_OWN, OwnwershipType.OWN, OwnwershipType.RENT]),
    rentalUnitSpaceType: z.enum([RentalUnitType.ENTIRE_HOME, RentalUnitType.SHARED_ACCOMMODATION]),
    isUnitOnPrincipalResidenceProperty: z.boolean(),
    hostResidence: z.enum([ResidenceType.ANOTHER_UNIT, ResidenceType.SAME_UNIT]),
    numberOfRoomsForRent: z.number({ required_error: t('validation.number') }).int().min(0),
    // TODO: update for street number/name/unit number
    address: getRequiredBCAddress(
      t('validation.address.street'),
      t('validation.address.city'),
      t('validation.address.region'),
      t('validation.address.postalCode'),
      t('validation.address.country'),
      t('validation.address.requiredBC.region'),
      t('validation.address.requiredBC.country')
    ).extend({
      unitNumber: getRequiredNonEmptyString(t('validation.address.unitNumber')),
      nickname: optionalOrEmptyString
    }),
    listingDetails: z.array(z.object({ url: getRequiredUrl(t('validation.listingDetails')) }))
  })

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

  const removeListingAtIndex = (index: number) => {
    property.value.listingDetails.splice(index, 1)
  }

  const addNewEmptyListing = () => {
    property.value.listingDetails.push({ url: '' })
  }

  const validateProperty = (returnBool = false): MultiFormValidationResult | boolean => {
    const result = validateSchemaAgainstState(propertySchema, property.value, 'property-form')

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
    propertySchema,
    addNewEmptyListing,
    removeListingAtIndex,
    validateProperty,
    $reset
  }
})
