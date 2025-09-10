<script setup lang="ts">
import type { Form } from '#ui/types'

const streetName = defineModel<string>('streetName', { required: false })
const streetNumber = defineModel<string>('streetNumber', { required: false })
const unitNumber = defineModel<string>('unitNumber', { required: false })
const streetAdditional = defineModel<string>('streetAdditional')
const city = defineModel<string>('city')
const postalCode = defineModel<string>('postalCode')
const locationDescription = defineModel<string>('locationDescription')

type AddressField = 'streetName' | 'streetNumber' |
  'unitNumber' | 'streetAdditional' | 'city' | 'postalCode' |
  'locationDescription'

defineProps<{
  id: string,
  schemaPrefix: string,
  formRef?: Form<any>,
  disabledFields?: AddressField[],
  unitNumbRequired?: boolean
}>()

const addId = useId()
const { isAddressHelpExpanded } = storeToRefs(useHostApplicationStore())
const { toggleAddressHelp } = useHostApplicationStore()

const hasNoStreetAddress = ref(false)

// clear site name when going back to street number and name inputs
watch(hasNoStreetAddress, () => {
  if (!hasNoStreetAddress.value) {
    streetAdditional.value = ''
  }
})

watch(postalCode, () => {
  postalCode.value = postalCode.value?.toUpperCase()
})
</script>
<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="font-bold">
        {{ $t('label.address') }}
      </div>
      <button
        type="button"
        class="flex items-center space-x-2 text-blue-500 hover:text-blue-700 focus:outline-none
               focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        @click="toggleAddressHelp"
      >
        <UIcon
          name="i-mdi-information-outline"
          class="size-4"
        />
        <span class="text-sm font-medium">
          {{ $t('help.address.title') }}
        </span>
      </button>
    </div>
    <FormUnitAddressHelp v-if="isAddressHelpExpanded" />
    <UCheckbox
      v-model="hasNoStreetAddress"
      label="I do not have a street address"
      data-testid="no-street-address-checkbox"
    />

    <!-- site Name -->
    <UFormGroup
      v-if="hasNoStreetAddress"
      :name="schemaPrefix + 'streetAdditional'"
      class="grow"
      :help="$t('hint.siteName')"
    >
      <UInput
        v-model.trim="streetAdditional"
        size="lg"
        :color="streetAdditional ? 'primary' : 'gray'"
        :placeholder="$t('label.siteName')"
        :aria-label="$t('label.siteName')"
        :aria-describedby="schemaPrefix + 'streetAdditional-' + addId"
        :disabled="disabledFields?.includes('streetAdditional')"
        maxlength="1000"
      />
    </UFormGroup>
    <!-- unit number / street number / name & type -->
    <div
      v-if="!hasNoStreetAddress"
      class="flex flex-col gap-3 sm:flex-row"
    >
      <!-- street number input -->
      <ConnectFormFieldGroup
        :id="id + '-streetNumber'"
        v-model.trim="streetNumber"
        class="w-5/12 sm:w-1/4"
        :name="schemaPrefix + 'streetNumber'"
        :color="city ? 'primary' : 'gray'"
        :is-disabled="disabledFields?.includes('streetNumber')"
        :placeholder="$t('label.streetNumber')"
        :aria-label="$t('label.streetNumber')"
        :is-required="true"
        :help="$t('hint.streetNumber')"
      />
      <!-- street name input -->
      <ConnectFormFieldGroup
        :id="id + '-streetName'"
        v-model.trim="streetName"
        class="w-full grow sm:w-1/2"
        :name="schemaPrefix + 'streetName'"
        :color="city ? 'primary' : 'gray'"
        :is-disabled="disabledFields?.includes('streetName')"
        :placeholder="$t('label.streetName')"
        :aria-label="$t('label.streetName')"
        :is-required="true"
        :help="$t('hint.streetName')"
      />
    </div>
    <!-- unit number input -->
    <div class="">
      <ConnectFormFieldGroup
        :id="schemaPrefix + 'unitNumber'"
        v-model.trim="unitNumber"
        class="[&_div]:max-w-full"
        :name="schemaPrefix + 'unitNumber'"
        :color="city ? 'primary' : 'gray'"
        :is-disabled="disabledFields?.includes('unitNumber')"
        :placeholder="$t('label.unitNumber')"
        :aria-label="$t('label.unitNumber')"
        :aria-required="unitNumbRequired || false"
        :help="$t('hint.unitNumber')"
      />
    </div>

    <div class="flex flex-col gap-3 sm:flex-row">
      <!-- city input -->
      <ConnectFormFieldGroup
        :id="schemaPrefix + 'city'"
        v-model.trim="city"
        class="w-full grow"
        :name="schemaPrefix + 'city'"
        :color="city ? 'primary' : 'gray'"
        :is-disabled="disabledFields?.includes('city')"
        :placeholder="$t('label.locality')"
        :aria-label="$t('label.locality')"
        :is-required="true"
        :help="$t('hint.locality')"
      />
      <!-- region input/menu -->
      <UFormGroup
        :name="schemaPrefix + 'region'"
        class="w-2/12 grow"
      >
        <UInput
          :model-value="'BC'"
          :placeholder="$t('label.region')"
          :aria-label="$t('label.region')"
          color="primary"
          size="lg"
          data-testid="address-region-input"
          :aria-required="true"
          :disabled="true"
          maxlength="1000"
        />
      </UFormGroup>
      <!-- postal code input -->
      <ConnectFormFieldGroup
        :id="schemaPrefix + 'postalCode'"
        v-model.trim="postalCode"
        v-maska="'@#@ #@#'"
        class="w-5/12 grow"
        :name="schemaPrefix + 'postalCode'"
        :color="postalCode ? 'primary' : 'gray'"
        :is-disabled="disabledFields?.includes('postalCode')"
        :placeholder="$t('label.postalCode')"
        :aria-label="$t('label.postalCode')"
        :is-required="true"
      />
    </div>
    <!-- delivery details input -->
    <UFormGroup
      :name="schemaPrefix + 'locationDescription'"
    >
      <UTextarea
        v-model.trim="locationDescription"
        :placeholder="$t('label.locationDescOpt')"
        :aria-label="$t('label.locationDescOpt')"
        :color="locationDescription ? 'primary' : 'gray'"
        :disabled="disabledFields?.includes('locationDescription')"
        class="w-full"
        data-testid="address-location-description"
        maxlength="1000"
        :ui="{
          padding: {
            sm: 'p-4'
          }
        }"
      />
    </UFormGroup>
  </div>
</template>
