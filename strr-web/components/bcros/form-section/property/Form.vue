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
          :business-license-expiry-date-error="businessLicenseExpiryDateError"
          @reset-field-error="resetFieldError"
          @validate-ownership="validateOwnershipType"
          @validate-property="validatePropertyType"
          @validate-business-license-expiry-date="validateBusinessLicenseExpiryDate"
          @validate-rental-unit-space-type="validateRentalUnitSpaceType"
          @validate-principal-residence="validatePrincipalResidenceOptions"
          @validate-host-residence="validateHostResidence"
          @validate-number-of-rooms-for-rent="validateNumberOfRoomsForRent"
        />
        <BcrosFormSectionPropertyAddress
          v-model:nickname="formState.propertyDetails.nickname"
          v-model:country="formState.propertyDetails.country"
          v-model:street-number="formState.propertyDetails.streetNumber"
          v-model:street-name="formState.propertyDetails.streetName"
          v-model:unit-number="formState.propertyDetails.unitNumber"
          v-model:address-line-two="formState.propertyDetails.addressLineTwo"
          v-model:city="formState.propertyDetails.city"
          v-model:province="formState.propertyDetails.province"
          v-model:postal-code="formState.propertyDetails.postalCode"
          street-number-id="propertyAddressStreetNumber"
          street-name-id="propertyAddressStreetName"
          :enable-address-complete="enableAddressComplete"
          default-country-iso2="CA"
          :address-not-in-b-c="addressNotInBC"
          :street-number-error="streetNumberError"
          :street-name-error="streetNameError"
          :unit-number-error="unitNumberError"
          :address-line-two-error="addressLineTwoError"
          :city-error="cityError"
          :province-error="provinceError"
          :postal-code-error="postalCodeError"
          @reset-field-error="resetFieldError"
          @validate-street-number="validateStreetNumber"
          @validate-street-name="validateStreetName"
          @validate-unit-number="validateUnitNumber"
          @validate-address-line-two="validateAddressLineTwo"
          @validate-city="validateCity"
          @validate-province="validateProvince"
          @validate-postal-code="validatePostalCode"
        />
        <BcrosFormSectionPropertyListingDetails
          v-model:listing-details="formState.propertyDetails.listingDetails"
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
  activeAddressField,
  addressWithStreetAttributes: canadaPostAddress,
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
  const activeAddressState = getActiveAddressState()
  if (newAddress && activeAddressState) {
    if (newAddress.region === 'BC') {
      addressNotInBC.value = false
      activeAddressState.streetNumber = newAddress.streetNumber
      activeAddressState.streetName = newAddress.streetName
      activeAddressState.addressLineTwo = newAddress.streetAdditional
      activeAddressState.country = newAddress.country
      activeAddressState.city = newAddress.city
      activeAddressState.province = newAddress.region
      activeAddressState.postalCode = newAddress.postalCode
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
const businessLicenseExpiryDateError = ref('')
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
  businessLicenseExpiryDateError.value = error ? error.message : ''
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

const streetNumberError = ref('')
const streetNameError = ref('')
const unitNumberError = ref('')
const addressLineTwoError = ref('')
const cityError = ref('')
const provinceError = ref('')
const postalCodeError = ref('')

const validateStreetNumber = () => {
  const parsed = propertyDetailsSchema.safeParse(formState.propertyDetails).error?.errors
  const error = parsed?.find(error => error.path.includes('streetNumber'))
  streetNumberError.value = error ? error.message : ''
}

const validateStreetName = () => {
  const parsed = propertyDetailsSchema.safeParse(formState.propertyDetails).error?.errors
  const error = parsed?.find(error => error.path.includes('streetName'))
  streetNameError.value = error ? error.message : ''
}

const validateUnitNumber = () => {
  const parsed = propertyDetailsSchema.safeParse(formState.propertyDetails).error?.errors
  const error = parsed?.find(error => error.path.includes('unitNumber'))
  unitNumberError.value = error ? error.message : ''
}

const validateAddressLineTwo = () => {
  const parsed = propertyDetailsSchema.safeParse(formState.propertyDetails).error?.errors
  const error = parsed?.find(error => error.path.includes('addressLineTwo'))
  addressLineTwoError.value = error ? error.message : ''
}

const validateCity = () => {
  const parsed = propertyDetailsSchema.safeParse(formState.propertyDetails).error?.errors
  const error = parsed?.find(error => error.path.includes('city'))
  cityError.value = error ? error.message : ''
}

const validateProvince = () => {
  const parsed = propertyDetailsSchema.safeParse(formState.propertyDetails).error?.errors
  const error = parsed?.find(error => error.path.includes('province'))
  provinceError.value = error ? error.message : ''
}

const validatePostalCode = () => {
  const parsed = propertyDetailsSchema.safeParse(formState.propertyDetails).error?.errors
  const error = parsed?.find(error => error.path.includes('postalCode'))
  postalCodeError.value = error ? error.message : ''
}

const resetFieldError = (errorTypes: string[]) => {
  const errorMap: Record<string, Ref<string>> = {
    propertyType: propertyTypeError,
    ownershipType: ownershipTypeError,
    rentalUnitSpaceType: rentalUnitSpaceTypeError,
    principalResidence: principalResidenceError,
    hostResidence: hostResidenceError,
    numberOfRoomsForRent: numberOfRoomsForRentError,
    streetNumber: streetNumberError,
    streetName: streetNameError,
    unitNumber: unitNumberError,
    addressLineTwo: addressLineTwoError,
    city: cityError,
    province: provinceError,
    postalCode: postalCodeError
  }

  errorTypes.forEach((errorType) => {
    if (errorType in errorMap) {
      errorMap[errorType].value = ''
    }
  })
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
    validateStreetNumber()
    validateStreetName()
    validateUnitNumber()
    validateAddressLineTwo()
    validateCity()
    validateProvince()
    validatePostalCode()
  }
})
</script>
