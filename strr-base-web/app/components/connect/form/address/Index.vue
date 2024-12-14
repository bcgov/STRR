<script setup lang="ts">
import type { Form } from '#ui/types'

const country = defineModel<string>('country')
const street = defineModel<string>('street', { required: false })
const streetName = defineModel<string>('streetName', { required: false })
const streetNumber = defineModel<string>('streetNumber', { required: false })
const unitNumber = defineModel<string>('unitNumber', { required: false })
const streetAdditional = defineModel<string>('streetAdditional')
const city = defineModel<string>('city')
const region = defineModel<string>('region')
const postalCode = defineModel<string>('postalCode')
const locationDescription = defineModel<string>('locationDescription')

type AddressField = 'country' | 'street' | 'streetName' | 'streetNumber' |
  'unitNumber' | 'streetAdditional' | 'city' | 'region' | 'postalCode' |
  'locationDescription'

const props = defineProps<{
  id: string,
  schemaPrefix: string,
  formRef?: Form<any>,
  disabledFields?: AddressField[],
  excludedFields?: AddressField[],
  // TODO: cleanup below strategies
  hideStreetHint?: boolean,
  locationDescLabel?: boolean,
  unitNumbRequired?: boolean
}>()

const checkFieldsExcluded = (fields: AddressField[]) => {
  return fields.every(field => props.excludedFields?.includes(field))
}

const { address: canadaPostAddress, enableAddressComplete } = useCanadaPostAddress()

const countries = iscCountriesListSortedByName
const regions = computed(() => {
  switch (country.value) {
    case 'US':
      return countrySubdivisions.us
    case 'CA':
      return countrySubdivisions.ca
    default:
      return []
  }
})

const addressComplete = (id: string) => {
  if (typeof country.value === 'string') {
    enableAddressComplete(id, country.value, !props.disabledFields?.includes('country'))
  }
}

watch(canadaPostAddress, (newAddress) => {
  // automatically populate all non excluded / non disabled fields
  if (newAddress) {
    // clear form validation for city/region/postalCode if address is autocompleted
    if (props.formRef) {
      props.formRef.clear(`${props.schemaPrefix}country`)
      props.formRef.clear(`${props.schemaPrefix}streetNumber`)
      props.formRef.clear(`${props.schemaPrefix}streetName`)
      props.formRef.clear(`${props.schemaPrefix}unitNumber`)
      props.formRef.clear(`${props.schemaPrefix}street`)
      props.formRef.clear(`${props.schemaPrefix}city`)
      props.formRef.clear(`${props.schemaPrefix}region`)
      props.formRef.clear(`${props.schemaPrefix}postalCode`)
    }
    for (const key of Object.keys(newAddress)) {
      if (
        !props.disabledFields?.includes(key as AddressField) &&
        !props.excludedFields?.includes(key as AddressField)
      ) {
        switch (key as AddressField) {
          case 'streetNumber':
            streetNumber.value = newAddress.streetNumber
            break
          case 'streetName':
            streetName.value = newAddress.streetName
            break
          case 'unitNumber':
            unitNumber.value = newAddress.unitNumber
            break
          case 'street':
            street.value = newAddress.street
            break
          case 'streetAdditional':
            streetAdditional.value = newAddress.streetAdditional
            break
          case 'country':
            country.value = newAddress.country
            break
          case 'city':
            city.value = newAddress.city
            break
          case 'region':
            region.value = newAddress.region
            break
          case 'postalCode':
            postalCode.value = newAddress.postalCode
        }
      }
    }
  }
})

const addId = useId()
</script>
<template>
  <div class="space-y-3">
    <!-- country menu -->
    <UFormGroup
      v-if="!checkFieldsExcluded(['country'])"
      :name="schemaPrefix + 'country'"
      class="grow"
    >
      <template #default="{ error }">
        <USelectMenu
          v-model="country"
          value-attribute="alpha_2"
          class="w-full"
          size="lg"
          :color="country ? 'primary' : 'gray'"
          :disabled="disabledFields?.includes('country')"
          :placeholder="$t('label.country')"
          :aria-label="$t('label.country')"
          :options="countries"
          :ui-menu="{ label: country ? 'text-gray-900' : !!error? 'text-red-600': 'text-gray-700'}"
          option-attribute="name"
          data-testid="address-country"
          :aria-required="true"
          :aria-invalid="error !== undefined"
          :aria-describedby="schemaPrefix + 'country-' + addId"
        />
      </template>

      <template #error="{ error }">
        <span :id="schemaPrefix + 'country-' + addId">
          {{ error }}
        </span>
      </template>
    </UFormGroup>
    <!-- street number / name / unit number -->
    <div
      v-if="!checkFieldsExcluded(['streetNumber', 'streetName', 'unitNumber'])"
      class="flex flex-col gap-3 sm:flex-row"
    >
      <!-- street number input -->
      <ConnectFormFieldGroup
        v-if="!checkFieldsExcluded(['streetNumber'])"
        :id="id + '-streetNumber'"
        v-model="streetNumber"
        class="w-full grow"
        :name="schemaPrefix + 'streetNumber'"
        :color="city ? 'primary' : 'gray'"
        :is-disabled="disabledFields?.includes('streetNumber')"
        :placeholder="$t('label.streetNumber')"
        :aria-label="$t('label.streetNumber')"
        :is-required="true"
        @keypress.once="addressComplete(id + '-streetNumber')"
        @click="addressComplete(id + '-streetNumber')"
      />
      <!-- street name input -->
      <ConnectFormFieldGroup
        v-if="!checkFieldsExcluded(['streetName'])"
        :id="id + '-streetName'"
        v-model="streetName"
        class="w-full grow"
        :name="schemaPrefix + 'streetName'"
        :color="city ? 'primary' : 'gray'"
        :is-disabled="disabledFields?.includes('streetName')"
        :placeholder="$t('label.streetName')"
        :aria-label="$t('label.streetName')"
        :is-required="true"
        @keypress.once="addressComplete(id + '-streetName')"
        @click="addressComplete(id + '-streetName')"
      />
      <!-- unit number input -->
      <ConnectFormFieldGroup
        v-if="!checkFieldsExcluded(['unitNumber'])"
        :id="schemaPrefix + 'unitNumber'"
        v-model="unitNumber"
        class="w-full grow"
        :name="schemaPrefix + 'unitNumber'"
        :color="city ? 'primary' : 'gray'"
        :is-disabled="disabledFields?.includes('unitNumber')"
        :placeholder="unitNumbRequired ? $t('label.unitNumber') : $t('label.unitNumberOpt')"
        :aria-label="unitNumbRequired ? $t('label.unitNumber') : $t('label.unitNumberOpt')"
        :aria-required="unitNumbRequired || false"
      />
    </div>
    <!-- street input -->
    <UFormGroup
      v-if="!checkFieldsExcluded(['street'])"
      :name="schemaPrefix + 'street'"
      class="grow"
    >
      <template #default="{ error }">
        <UInput
          :id="id + '-street'"
          v-model="street"
          size="lg"
          :color="street ? 'primary' : 'gray'"
          :aria-label="$t('label.line1')"
          :placeholder="$t('label.line1')"
          :aria-required="true"
          :aria-invalid="error !== undefined"
          :aria-describedby="schemaPrefix + 'street-' + addId"
          :disabled="disabledFields?.includes('street')"
          maxlength="1000"
          @keypress.once="addressComplete(id + '-street')"
          @click="addressComplete(id + '-street')"
        />
      </template>
      <template #help>
        <span v-if="!hideStreetHint" :id="schemaPrefix + 'street-' + addId">
          {{ $t('text.streetHint') }}
        </span>
      </template>

      <template #error="{ error }">
        <span :id="schemaPrefix + 'street-' + addId">
          {{ error }}
        </span>
      </template>
    </UFormGroup>
    <!-- street line 2 -->
    <UFormGroup
      v-if="!checkFieldsExcluded(['streetAdditional'])"
      :name="schemaPrefix + 'streetAdditional'"
      class="grow"
    >
      <UInput
        v-model="streetAdditional"
        size="lg"
        :color="streetAdditional ? 'primary' : 'gray'"
        :placeholder="$t('label.line2')"
        :aria-label="$t('label.line2')"
        :disabled="disabledFields?.includes('streetAdditional')"
        maxlength="1000"
      />
    </UFormGroup>
    <div v-if="!checkFieldsExcluded(['city', 'region', 'postalCode'])" class="flex flex-col gap-3 sm:flex-row">
      <!-- city input -->
      <ConnectFormFieldGroup
        v-if="!checkFieldsExcluded(['city'])"
        :id="schemaPrefix + 'city'"
        v-model="city"
        class="w-full grow"
        :name="schemaPrefix + 'city'"
        :color="city ? 'primary' : 'gray'"
        :is-disabled="disabledFields?.includes('city')"
        :placeholder="$t('label.city')"
        :aria-label="$t('label.city')"
        :is-required="true"
      />
      <!-- region input/menu -->
      <UFormGroup
        v-if="!checkFieldsExcluded(['region'])"
        :name="schemaPrefix + 'region'"
        class="w-full grow"
      >
        <template #default="{ error }">
          <USelectMenu
            v-if="country === 'US' || country === 'CA'"
            v-model="region"
            :options="regions"
            :placeholder="country === 'CA' ? $t('label.province') : $t('label.state')"
            :aria-label="country === 'CA' ? $t('label.province') : $t('label.state')"
            size="lg"
            :color="region ? 'primary' : 'gray'"
            option-attribute="name"
            value-attribute="code"
            :ui-menu="{ label: region ? 'text-gray-900' : !!error? 'text-red-600': 'text-gray-700'}"
            data-testid="address-region-select"
            :aria-required="true"
            :aria-invalid="error !== undefined"
            :aria-describedby="schemaPrefix + 'region-' + addId"
            :disabled="disabledFields?.includes('region')"
          />
          <UInput
            v-else
            v-model="region"
            :placeholder="$t('label.region')"
            :aria-label="$t('label.region')"
            :color="region ? 'primary' : 'gray'"
            size="lg"
            data-testid="address-region-input"
            :aria-required="true"
            :aria-invalid="error !== undefined"
            :aria-describedby="schemaPrefix + 'region-' + addId"
            :disabled="disabledFields?.includes('region')"
            maxlength="1000"
          />
        </template>

        <template #error="{ error }">
          <span :id="schemaPrefix + 'region-' + addId">
            {{ error }}
          </span>
        </template>
      </UFormGroup>
      <!-- postal code input -->
      <ConnectFormFieldGroup
        v-if="!checkFieldsExcluded(['postalCode'])"
        :id="schemaPrefix + 'postalCode'"
        v-model="postalCode"
        class="w-full grow"
        :name="schemaPrefix + 'postalCode'"
        :color="postalCode ? 'primary' : 'gray'"
        :is-disabled="disabledFields?.includes('postalCode')"
        :placeholder="country === 'CA' ?
          $t('label.postalCode') : country === 'US' ? $t('label.zipCode') : $t('label.code')"
        :aria-label="$t('label.postalCode')"
        :is-required="true"
      />
    </div>
    <!-- delivery details input -->
    <UFormGroup
      v-if="!checkFieldsExcluded(['locationDescription'])"
      :name="schemaPrefix + 'locationDescription'"
    >
      <UTextarea
        v-model="locationDescription"
        :placeholder="locationDescLabel
          ? $t('label.locationDescriptionOpt')
          : $t('label.deliveryInstructionsOpt')"
        :aria-label="locationDescLabel
          ? $t('label.locationDescriptionOpt')
          : $t('label.deliveryInstructionsOpt')"
        :color="locationDescription ? 'primary' : 'gray'"
        :disabled="disabledFields?.includes('locationDescription')"
        class="w-full"
        data-testid="address-location-description"
        maxlength="1000"
      />
    </UFormGroup>
  </div>
</template>
