<script setup lang="ts">

const { t } = useI18n()

const { propertyDetailsSchema } = useStrrProperty()
const { property } = storeToRefs(useStrrProperty())

const { isComplete } = defineProps<{ isComplete: boolean }>()

const propertyTypes: string[] = [
  t('createAccount.propertyForm.primaryDwelling'),
  t('createAccount.propertyForm.secondarySuite'),
  t('createAccount.propertyForm.accessory'),
  t('createAccount.propertyForm.float'),
  t('createAccount.propertyForm.other')
]

const ownershipTypes: string[] = [
  t('createAccount.propertyForm.rent'),
  t('createAccount.propertyForm.own'),
  t('createAccount.propertyForm.other')
]

// fullName: string,
// hasSecondaryContact: boolean,
// toggleAddSecondary:() => void,

const {
  address: canadaPostAddress,
  enableAddressComplete
} = useCanadaPostAddress()

const propertyForm = ref()
watch(propertyForm, () => {
  if (propertyForm.value && isComplete) { propertyForm.value.validate() }
})

watch(canadaPostAddress, (newAddress) => {
  propertyForm.value.clear('address.country')
  propertyForm.value.clear('address.city')
  propertyForm.value.clear('address.region')
  propertyForm.value.clear('address.postalCode')
  if (newAddress) {
    property.value.address.street = newAddress.street
    property.value.address.streetAdditional = newAddress.streetAdditional
    property.value.address.country = newAddress.country
    property.value.address.city = newAddress.city
    property.value.address.region = newAddress.region
    property.value.address.postalCode = newAddress.postalCode
    // property.value.address.locationDescription = newAddress.locationDescription
  }
  if (property.value.address.region !== 'BC') {
    propertyForm.value.setErrors([{ message: 'Please enter a BC address', path: 'address.region' }])
  }
  propertyForm.value.validate('address.region', { silent: true })
  propertyForm.value.validate('address.country', { silent: true })
})

</script>

<template>
  <div data-testid="property-information">
    <ConnectPageSection
      class="bg-white"
      :heading="{ label: t('createAccount.propertyForm.subtitle'), labelClass: 'font-bold md:ml-6' }"
    >
      <UForm
        ref="propertyForm"
        :schema="propertyDetailsSchema"
        :state="property"
        class="space-y-10 pb-10"
      >
        <ConnectFormSection :title="t('createAccount.propertyForm.rentalUnitAddress')">
          <div class="max-w-bcGovInput space-y-5">
            <ConnectFormFieldGroup
              id="property-nickname"
              v-model="property.nickname"
              name="nickname"
              :placeholder="$t('createAccount.propertyForm.nickname')"
            />
            <ConnectFormAddress
              id="rentalUnitAddress"
              v-model:country="property.address.country"
              v-model:street="property.address.street"
              v-model:street-additional="property.address.streetAdditional"
              v-model:city="property.address.city"
              v-model:region="property.address.region"
              v-model:postal-code="property.address.postalCode"
              v-model:location-description="property.address.locationDescription"
              :schema-prefix="'address.'"
              :enable-address-complete="enableAddressComplete"
            />
          </div>
        </ConnectFormSection>
        <ConnectFormSection :title="t('createAccount.propertyForm.rentalUnitDetails')">
          <div class="max-w-bcGovInput space-y-5">
            <ConnectFormFieldGroup
              id="parcel-itentifier"
              v-model="property.parcelIdentifier"
              name="parcelIdentifier"
              :placeholder="$t('createAccount.propertyForm.parcelIdentifier')"
            />
            <ConnectFormFieldGroup
              id="business-license"
              v-model="property.businessLicense"
              name="businessLicense"
              :placeholder="$t('createAccount.propertyForm.businessLicense')"
            />
            <UFormGroup v-slot="{ error }" name="propertyType">
              <USelectMenu
                v-model="property.propertyType"
                aria-label="property types"
                :placeholder="t('createAccount.propertyForm.propertyType')"
                :options="propertyTypes"
                option-attribute="name"
                size="lg"
                :color="property.propertyType ? 'primary' : 'gray'"
                :ui-menu="{
                  label: property.propertyType
                    ? 'text-gray-900'
                    : !!error ? 'text-red-600' : 'text-gray-700'
                }"
                data-testid="property-type-select"
              />
            </UFormGroup>
            <UFormGroup v-slot="{ error }" name="ownershipType">
              <USelectMenu
                v-model="property.ownershipType"
                aria-label="ownership types"
                :placeholder="t('createAccount.propertyForm.ownershipType')"
                :options="ownershipTypes"
                option-attribute="name"
                size="lg"
                :color="property.ownershipType ? 'primary' : 'gray'"
                :ui-menu="{
                  label: property.ownershipType
                    ? 'text-gray-900'
                    : !!error ? 'text-red-600' : 'text-gray-700'
                }"
                data-testid="ownership-type-select"
              />
            </UFormGroup>
          </div>
        </ConnectFormSection>
        <ConnectFormSection :title="t('createAccount.propertyForm.internetListingDetails')">
          <div name="whichPlatform" class="space-y-5">
            <ConnectFormFieldGroup
              id="platform-url"
              v-model="property.whichPlatform"
              name="whichPlatform"
              help="i.e. https://www.xxx.com"
              :placeholder="$t('createAccount.propertyForm.platformUrl')"
            />
          </div>
        </ConnectFormSection>
      </UForm>
    </ConnectPageSection>
  </div>
</template>
