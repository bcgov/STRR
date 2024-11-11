<template>
  <div data-test-id="property-form-section" class="relative h-full">
    <div class="desktop:mb-[180px] mobile:mb-[32px] bg-white rounded-[4px]">
      <div class="bg-bcGovColor-gray2 rounded-t-[4px]">
        <p class="px-[40px] py-[15px] font-bold">
          {{ t('createAccount.propertyForm.subtitle') }}
        </p>
      </div>
      <UForm ref="form" :schema="propertyDetailsSchema" :state="formState.propertyDetails">
        <BcrosFormSectionPropertyDetails
          v-model:property-type="formState.propertyDetails.propertyType"
          v-model:ownership-type="formState.propertyDetails.ownershipType"
          v-model:business-license="formState.propertyDetails.businessLicense"
          v-model:parcel-identifier="formState.propertyDetails.parcelIdentifier"
          v-model:business-license-expiry-date="formState.propertyDetails.businessLicenseExpiryDate"
          v-model:rental-unit-space-type="formState.propertyDetails.rentalUnitSpaceType"
          v-model:is-unit-on-principal-residence-property="formState.propertyDetails.isUnitOnPrincipalResidenceProperty"
          v-model:host-residence="formState.propertyDetails.hostResidence"
          v-model:number-of-rooms-for-rent="formState.propertyDetails.numberOfRoomsForRent"
          :property-types="propertyTypes"
          :ownership-types="ownershipTypes"
          :ownership-type-error="ownershipTypeError"
          :property-type-error="propertyTypeError"
          :rental-unit-space-type-error="rentalUnitSpaceTypeError"
          :principal-residence-error="principalResidenceError"
          :host-residence-error="hostResidenceError"
          :number-of-rooms-for-rent-error="numberOfRoomsForRentError"
          @validate-ownership="validateOwnershipType"
          @validate-property="validatePropertyType"
          @validate-business-license-expiry-date="validateBusinessLicenseExpiryDate"
          @validate-rental-unit-space-type="validateRentalUnitSpaceType"
          @validate-principal-residence="validatePrincipalResidenceOptions"
          @validate-host-residence="validateHostResidence"
          @validate-number-of-rooms-for-rent="validateNumberOfRoomsForRent"
        />
        <BcrosFormSectionPropertyAddress
          id="propertyAddress"
          v-model:nickname="formState.propertyDetails.nickname"
          v-model:country="formState.propertyDetails.country"
          v-model:address="formState.propertyDetails.address"
          v-model:address-line-two="formState.propertyDetails.addressLineTwo"
          v-model:city="formState.propertyDetails.city"
          v-model:province="formState.propertyDetails.province"
          v-model:postal-code="formState.propertyDetails.postalCode"
          :enable-address-complete="enableAddressComplete"
          default-country-iso2="CA"
          :address-not-in-b-c="addressNotInBC"
        />
        <BcrosFormSectionPropertyListingDetails
          v-model:listing-details="formState.propertyDetails.listingDetails"
          :enable-address-complete="enableAddressComplete"
          :add-platform="addPlatform"
          :remove-detail-at-index="removeDetailAtIndex"
          :invalid-urls="listingURLErrors"
          @validate-field="(index: number) => validateField(index)"
        />
      </UForm>
    </div>
  </div>
</template>

<script setup lang="ts">
import { sanitizeUrl } from '@braintree/sanitize-url'

const { isComplete } = defineProps<{
  isComplete: boolean
}>()

const addressNotInBC = ref(false)

const {
  address: canadaPostAddress,
  enableAddressComplete
} = useCanadaPostAddress(true)

const getActiveAddressState = () => {
  if (activeAddressField.value === 'propertyAddressStreetNumber' ||
      activeAddressField.value === 'propertyAddressStreetName') {
    return formState.propertyDetails
  }
  return null
}

watch(canadaPostAddress, (newAddress) => {
  if (newAddress) {
    if (newAddress.region === 'BC') {
      addressNotInBC.value = false
      formState.propertyDetails.address = newAddress.street
      formState.propertyDetails.addressLineTwo = newAddress.streetAdditional
      formState.propertyDetails.country = newAddress.country
      formState.propertyDetails.city = newAddress.city
      formState.propertyDetails.province = newAddress.region
      formState.propertyDetails.postalCode = newAddress.postalCode
    } else {
      addressNotInBC.value = true
    }
  }
})

watch(() => formState.propertyDetails.isUnitOnPrincipalResidenceProperty, (newValue) => {
  if (!newValue) {
    formState.propertyDetails.hostResidence = undefined // Reset if not required
  }
  validateHostResidence() // Ensure validation reflects changes
})

const { t } = useTranslation()

const isValid = ref(false)
const listingURLErrors = ref<(({
    errorIndex: string | number;
    message: string;
} | undefined)[] | undefined)>([])

const addPlatform = () => {
  formState.propertyDetails.listingDetails.push({ url: '' })
}

const removeDetailAtIndex = (index: number) => {
  formState.propertyDetails.listingDetails.splice(index, 1)
}

const validateField = (index: number) => {
  const listingDetailsErrorsExist = propertyDetailsSchema.safeParse(formState.propertyDetails).error?.errors
    .find(error => error.path[0] === 'listingDetails')
  if (listingDetailsErrorsExist) {
    const invalidUrl = propertyDetailsSchema.safeParse(formState.propertyDetails).error?.errors
      .filter(error => error.path[0] === 'listingDetails' && error.path[1].toString() === index.toString())
      .map((error) => {
        return {
          errorIndex: error.path[1],
          message: error.message
        }
      })
    // if validation isn't passed
    if (invalidUrl) {
      listingURLErrors.value?.length
        // if other errors exist add this one
        ? listingURLErrors.value.push(invalidUrl[0])
        // if no other errors this becomes the error object
        : listingURLErrors.value = invalidUrl
    } else if (listingURLErrors.value?.length === 0) {
      // if no other errors and URL is valid replace value with undefined
      listingURLErrors.value = undefined
    } else {
      const removalIndex = listingURLErrors.value?.findIndex(nonerror => nonerror?.errorIndex === index)
      if (removalIndex !== -1) {
        listingURLErrors.value?.splice(removalIndex, 1)
      }
    }
  } else {
    listingURLErrors.value = undefined
  }

  formState.propertyDetails.listingDetails[index].url = sanitizeUrl(
    formState.propertyDetails.listingDetails[index].url
  )
}

const validateAllPropertyListingUrls = () => {
  if (propertyDetailsSchema.safeParse(formState.propertyDetails).error) {
    const invalidUrls = propertyDetailsSchema.safeParse(formState.propertyDetails).error?.errors
      .filter(error => error.path[0] === 'listingDetails')
      .map((error) => {
        return {
          errorIndex: error.path[1],
          message: error.message
        }
      })
    listingURLErrors.value = invalidUrls
  }
}

watch(formState.propertyDetails, () => {
  isValid.value = propertyDetailsSchema.safeParse(formState.propertyDetails).success
})

defineEmits<{
  validatePage: [isValid: boolean]
}>()

const propertyTypes: string[] = [
  t('createAccount.propertyForm.singleFamilyHome'),
  t('createAccount.propertyForm.secondarySuite'),
  t('createAccount.propertyForm.accessoryDwelling'),
  t('createAccount.propertyForm.townhome'),
  t('createAccount.propertyForm.multiUnitHousing'),
  t('createAccount.propertyForm.condoApartment'),
  t('createAccount.propertyForm.recreationalProperty'),
  t('createAccount.propertyForm.bedAndBreakfast'),
  t('createAccount.propertyForm.strataHotel'),
  t('createAccount.propertyForm.floatHome')
]

const ownershipTypes: string[] = [
  t('createAccount.propertyForm.rent'),
  t('createAccount.propertyForm.own'),
  t('createAccount.propertyForm.coOwn')
]

const propertyTypeError = ref('')
const ownershipTypeError = ref('')
const businessLicenseExpiryDate = ref('')
const rentalUnitSpaceTypeError = ref('')
const principalResidenceError = ref('')
const hostResidenceError = ref('')
const numberOfRoomsForRentError = ref('')

const validatePropertyType = () => {
  const parsed = propertyDetailsSchema.safeParse(formState.propertyDetails).error?.errors
  const error = parsed?.find(error => error.path.includes('propertyType'))
  propertyTypeError.value = error ? error.message : ''
}

const validateOwnershipType = () => {
  const parsed = propertyDetailsSchema.safeParse(formState.propertyDetails).error?.errors
  const error = parsed?.find(error => error.path.includes('ownershipType'))
  ownershipTypeError.value = error ? error.message : ''
}

const validateBusinessLicenseExpiryDate = () => {
  const parsed = propertyDetailsSchema.safeParse(formState.propertyDetails).error?.errors
  const error = parsed?.find(error => error.path.includes('businessLicenseExpiryDate'))
  businessLicenseExpiryDate.value = error ? error.message : ''
}

const validateRentalUnitSpaceType = () => {
  if (!formState.propertyDetails.rentalUnitSpaceType) {
    rentalUnitSpaceTypeError.value = t('createAccount.propertyForm.rentalUnitSpaceTypeRequired')
  } else {
    rentalUnitSpaceTypeError.value = ''
  }
}

watch(
  () => formState.propertyDetails.isUnitOnPrincipalResidenceProperty,
  (newValue) => {
    // Coerce string "true"/"false" to boolean true/false
    if (newValue === 'true') {
      formState.propertyDetails.isUnitOnPrincipalResidenceProperty = true
    } else if (newValue === 'false') {
      formState.propertyDetails.isUnitOnPrincipalResidenceProperty = false
    }

    if (isComplete) {
      validatePrincipalResidenceOptions()
    }
  }
)

const validatePrincipalResidenceOptions = () => {
  const value = formState.propertyDetails.isUnitOnPrincipalResidenceProperty
  if (value === null || value === undefined) {
    principalResidenceError.value = t('createAccount.propertyForm.isUnitOnPrincipalResidencePropertyRequired')
  } else {
    principalResidenceError.value = '' // Clear the error if a valid selection is made
  }
}

const validateHostResidence = () => {
  hostResidenceError.value =
    (formState.propertyDetails.isUnitOnPrincipalResidenceProperty && !formState.propertyDetails.hostResidence)
      ? t('createAccount.propertyForm.hostResidenceRequiredError')
      : ''
}

const validateNumberOfRoomsForRent = () => {
  let value = formState.propertyDetails?.numberOfRoomsForRent

  if (!Number.isInteger(Number(value))) {
    value = Math.floor(Number(value))
    formState.propertyDetails.numberOfRoomsForRent = value
  }

  if (value < 1) {
    numberOfRoomsForRentError.value = t('createAccount.propertyForm.numberOfRoomsForRentRequired')
  } else if (value > 5000) {
    numberOfRoomsForRentError.value = t('createAccount.propertyForm.numberOfRoomsForRentMaxExceeded')
  } else {
    numberOfRoomsForRentError.value = ''
  }
}

const form = ref()

watch(form, () => {
  if (form.value && isComplete) { form.value.validate({ silent: true }) }
})

onMounted(() => {
  if (isComplete && !isValid.value) {
    validateAllPropertyListingUrls()
  }
  if (isComplete) {
    validatePropertyType()
    validateOwnershipType()
    validateRentalUnitSpaceType()
    validatePrincipalResidenceOptions()
    validateHostResidence()
    validateNumberOfRoomsForRent()
  }
})
</script>
