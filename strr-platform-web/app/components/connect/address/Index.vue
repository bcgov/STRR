<script setup lang="ts">

const { t } = useI18n()

const country = defineModel<string>('country')
const street = defineModel<string>('street')
const streetAdditional = defineModel<string>('streetAdditional')
const city = defineModel<string>('city')
const region = defineModel<string>('region')
const postalCode = defineModel<string>('postalCode')
const locationDescription = defineModel<string>('locationDescription')

const {
  id,
  enableAddressComplete,
  schemaPrefix
} = defineProps<{
  id: string,
  enableAddressComplete:(id: string, countryIso2: string, countrySelect: boolean) => void,
  schemaPrefix: string
}>()

defineEmits<{ setId: [id: string] }>()

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
    enableAddressComplete(id, country.value, true)
  }
}

</script>

<template>
  <div data-testid="form-section-mailing" class="space-y-3">
    <div class="flex flex-row">
      <UFormGroup v-slot="{ error }" :name="schemaPrefix + 'country'" class="grow">
        <USelectMenu
          v-model="country"
          value-attribute="alpha_2"
          class="w-full"
          size="lg"
          :color="country ? 'primary' : 'gray'"
          :placeholder="$t('label.country')"
          :options="countries"
          :ui-menu="{ label: country ? 'text-gray-900' : !!error? 'text-red-600': 'text-gray-700'}"
          option-attribute="name"
          data-testid="address-country"
        />
      </UFormGroup>
    </div>
    <div class="flex flex-row">
      <UFormGroup :name="schemaPrefix + 'street'" :hint="t('text.streetHint')" class="grow">
        <UInput
          :id="id"
          v-model="street"
          size="lg"
          :color="street ? 'primary' : 'gray'"
          aria-label="street"
          :placeholder="t('label.street')"
          @keypress.once="addressComplete()"
          @click="addressComplete()"
        />
      </UFormGroup>
    </div>
    <div class="flex flex-row sm:flex-col">
      <UFormGroup :name="schemaPrefix + 'streetAdditional'" class="grow">
        <UInput
          v-model="streetAdditional"
          size="lg"
          :color="streetAdditional ? 'primary' : 'gray'"
          :placeholder="t('label.streetAdditional')"
          aria-label="address line two"
        />
      </UFormGroup>
    </div>
    <div class="flex flex-col gap-3 sm:flex-row">
      <UFormGroup :name="schemaPrefix + 'city'" class="w-full grow">
        <UInput
          v-model="city"
          size="lg"
          :color="city ? 'primary' : 'gray'"
          :placeholder="t('createAccount.contactForm.city')"
          aria-label="city"
        />
      </UFormGroup>
      <UFormGroup ref="test" v-slot="{ error }" :name="schemaPrefix + 'region'" class="w-full grow">
        <USelectMenu
          v-if="country === 'US' || country === 'CA'"
          ref="refRegion"
          v-model="region"
          :options="regions"
          :placeholder="country === 'CA' ? t('createAccount.contactForm.province') : $t('label.state')"
          size="lg"
          :color="region ? 'primary' : 'gray'"
          option-attribute="name"
          value-attribute="code"
          :ui-menu="{ label: region ? 'text-gray-900' : !!error? 'text-red-600': 'text-gray-700'}"
          data-testid="address-region-select"
        />
        <UInput
          v-else
          v-model="region"
          :placeholder="'Region'"
          class="w-full pr-4"
          :color="region ? 'primary' : 'gray'"
          size="lg"
          data-testid="address-region-input"
        />
      </UFormGroup>
      <UFormGroup :name="schemaPrefix + 'postalCode'" class="w-full grow">
        <UInput
          v-model="postalCode"
          size="lg"
          :color="postalCode ? 'primary' : 'gray'"
          :placeholder="country === 'CA' ?
            t('createAccount.contactForm.postalCode') : country === 'US' ? 'Zip Code' : 'Code'"
          aria-label="postal code"
        />
      </UFormGroup>
    </div>
    <UFormGroup :name="schemaPrefix + 'locationDescription'">
      <UTextarea
        v-model="locationDescription"
        :placeholder="$t('label.locationDescription')"
        :color="locationDescription ? 'primary' : 'gray'"
        class="w-full"
        data-testid="address-location-description"
      />
    </UFormGroup>
  </div>
</template>
