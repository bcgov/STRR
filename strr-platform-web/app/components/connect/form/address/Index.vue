<script setup lang="ts">
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

const addId = useId()
</script>
<template>
  <div data-testid="form-section-mailing" class="space-y-3">
    <!-- country menu -->
    <UFormGroup :name="schemaPrefix + 'country'" class="grow">
      <template #default="{ error }">
        <USelectMenu
          v-model="country"
          value-attribute="alpha_2"
          class="w-full"
          size="lg"
          :color="country ? 'primary' : 'gray'"
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
    <UFormGroup :name="schemaPrefix + 'street'" class="grow">
      <template #default="{ error }">
        <UInput
          :id="id"
          v-model="street"
          size="lg"
          :color="street ? 'primary' : 'gray'"
          :aria-label="$t('label.street')"
          :placeholder="$t('label.street')"
          :aria-required="true"
          :aria-invalid="error !== undefined"
          :aria-describedby="schemaPrefix + 'street-' + addId"
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
    <UFormGroup :name="schemaPrefix + 'streetAdditional'" class="grow">
      <UInput
        v-model="streetAdditional"
        size="lg"
        :color="streetAdditional ? 'primary' : 'gray'"
        :placeholder="$t('label.streetAdditional')"
        :aria-label="$t('label.streetAdditional')"
      />
    </UFormGroup>
    <div class="flex flex-col gap-3 sm:flex-row">
      <!-- city input -->
      <ConnectFormFieldGroup
        :id="schemaPrefix + 'city'"
        v-model="city"
        class="w-full grow"
        :name="schemaPrefix + 'city'"
        :color="city ? 'primary' : 'gray'"
        :placeholder="$t('createAccount.contactForm.city')"
        :aria-label="$t('createAccount.contactForm.city')"
        :is-required="true"
      />
      <!-- region input/menu -->
      <UFormGroup :name="schemaPrefix + 'region'" class="w-full grow">
        <template #default="{ error }">
          <USelectMenu
            v-if="country === 'US' || country === 'CA'"
            v-model="region"
            :options="regions"
            :placeholder="country === 'CA' ? $t('createAccount.contactForm.province') : $t('label.state')"
            :aria-label="country === 'CA' ? $t('createAccount.contactForm.province') : $t('label.state')"
            size="lg"
            :color="region ? 'primary' : 'gray'"
            option-attribute="name"
            value-attribute="code"
            :ui-menu="{ label: region ? 'text-gray-900' : !!error? 'text-red-600': 'text-gray-700'}"
            data-testid="address-region-select"
            :aria-required="true"
            :aria-invalid="error !== undefined"
            :aria-describedby="schemaPrefix + 'region-' + addId"
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
        :id="schemaPrefix + 'postalCode'"
        v-model="postalCode"
        class="w-full grow"
        :name="schemaPrefix + 'postalCode'"
        :color="postalCode ? 'primary' : 'gray'"
        :placeholder="country === 'CA' ?
          $t('createAccount.contactForm.postalCode') : country === 'US' ? 'Zip Code' : 'Code'"
        :aria-label="$t('createAccount.contactForm.postalCode')"
        :is-required="true"
      />
    </div>
    <!-- delivery details input -->
    <UFormGroup :name="schemaPrefix + 'locationDescription'">
      <UTextarea
        v-model="locationDescription"
        :placeholder="$t('label.locationDescription')"
        :aria-label="$t('label.locationDescription')"
        :color="locationDescription ? 'primary' : 'gray'"
        class="w-full"
        data-testid="address-location-description"
      />
    </UFormGroup>
  </div>
</template>
