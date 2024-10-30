<script setup lang="ts">
const country = defineModel<string>('country')
const street = defineModel<string>('street')
const streetAdditional = defineModel<string>('streetAdditional')
const city = defineModel<string>('city')
const region = defineModel<string>('region')
const postalCode = defineModel<string>('postalCode')
const locationDescription = defineModel<string>('locationDescription')

type AddressField = 'country' | 'street' | 'streetAdditional' | 'city' |
  'region' | 'postalCode' | 'locationDescription'

const {
  id,
  enableAddressComplete,
  schemaPrefix,
  disabledFields
} = defineProps<{
  id: string,
  enableAddressComplete:(id: string, countryIso2: string, countrySelect: boolean) => void,
  schemaPrefix: string,
  disabledFields?: AddressField[],
  excludedFields?: AddressField[],
  locationDescLabel?: boolean
}>()

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

const addressComplete = () => {
  if (typeof country.value === 'string') {
    enableAddressComplete(id, country.value, !disabledFields?.includes('country'))
  }
}

const addId = useId()
</script>
<template>
  <div class="space-y-3">
    <!-- country menu -->
    <UFormGroup
      v-if="!excludedFields?.includes('country')"
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
    <!-- street input -->
    <UFormGroup
      v-if="!excludedFields?.includes('street')"
      :name="schemaPrefix + 'street'"
      class="grow"
    >
      <template #default="{ error }">
        <UInput
          :id="id"
          v-model="street"
          size="lg"
          :color="street ? 'primary' : 'gray'"
          :aria-label="$t('label.line1')"
          :placeholder="$t('label.line1')"
          :aria-required="true"
          :aria-invalid="error !== undefined"
          :aria-describedby="schemaPrefix + 'street-' + addId"
          :disabled="disabledFields?.includes('street')"
          @keypress.once="addressComplete()"
          @click="addressComplete()"
        />
      </template>
      <template #help>
        <span :id="schemaPrefix + 'street-' + addId">
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
      v-if="!excludedFields?.includes('streetAdditional')"
      :name="schemaPrefix + 'streetAdditional'"
      class="grow"
    >
      <UInput
        v-model="streetAdditional"
        size="lg"
        :color="streetAdditional ? 'primary' : 'gray'"
        :placeholder="$t('label.line2')"
        :aria-label="$t('label.lin2')"
        :disabled="disabledFields?.includes('streetAdditional')"
      />
    </UFormGroup>
    <div class="flex flex-col gap-3 sm:flex-row">
      <!-- city input -->
      <ConnectFormFieldGroup
        v-if="!excludedFields?.includes('city')"
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
        v-if="!excludedFields?.includes('region')"
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
        v-if="!excludedFields?.includes('postalCode')"
        :id="schemaPrefix + 'postalCode'"
        v-model="postalCode"
        class="w-full grow"
        :name="schemaPrefix + 'postalCode'"
        :color="postalCode ? 'primary' : 'gray'"
        :is-disabled="disabledFields?.includes('postalCode')"
        :placeholder="country === 'CA' ?
          $t('createAccount.contactForm.postalCode') : country === 'US' ? 'Zip Code' : 'Code'"
        :aria-label="$t('createAccount.contactForm.postalCode')"
        :is-required="true"
      />
    </div>
    <!-- delivery details input -->
    <UFormGroup
      v-if="!excludedFields?.includes('locationDescription')"
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
      />
    </UFormGroup>
  </div>
</template>
