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

watch(postalCode, () => {
  postalCode.value = postalCode.value?.toUpperCase()
})
</script>
<template>
  <div class="space-y-3">
    <!-- country menu -->
    <UFormGroup
      :name="schemaPrefix + 'country'"
      class="grow"
    >
      <UInput
        :model-value="'Canada'"
        :placeholder="$t('label.country')"
        :aria-label="$t('label.country')"
        color="primary"
        size="lg"
        data-testid="address-region-input"
        :aria-required="true"
        :disabled="true"
      />
    </UFormGroup>
    <!-- unit number / street number / name & type -->
    <div
      class="flex flex-col gap-3 sm:flex-row"
    >
      <!-- unit number input -->
      <ConnectFormFieldGroup
        :id="schemaPrefix + 'unitNumber'"
        v-model="unitNumber"
        class="w-full grow sm:w-1/4"
        :name="schemaPrefix + 'unitNumber'"
        :color="city ? 'primary' : 'gray'"
        :is-disabled="disabledFields?.includes('unitNumber')"
        :placeholder="$t('label.unitNumber')"
        :aria-label="$t('label.unitNumber')"
        :aria-required="unitNumbRequired || false"
      />
      <UDivider class="-mx-2 hidden max-w-2 sm:flex" size="xs" />
      <!-- street number input -->
      <ConnectFormFieldGroup
        :id="id + '-streetNumber'"
        v-model="streetNumber"
        class="w-full grow sm:w-1/4"
        :name="schemaPrefix + 'streetNumber'"
        :color="city ? 'primary' : 'gray'"
        :is-disabled="disabledFields?.includes('streetNumber')"
        :placeholder="$t('label.streetNumber')"
        :aria-label="$t('label.streetNumber')"
        :is-required="true"
      />
      <!-- street name input -->
      <ConnectFormFieldGroup
        :id="id + '-streetName'"
        v-model="streetName"
        class="w-full grow sm:w-1/2"
        :name="schemaPrefix + 'streetName'"
        :color="city ? 'primary' : 'gray'"
        :is-disabled="disabledFields?.includes('streetName')"
        :placeholder="$t('label.streetNameAndType')"
        :aria-label="$t('label.streetNameAndType')"
        :is-required="true"
      />
    </div>
    <!-- street line 2 -->
    <UFormGroup
      :name="schemaPrefix + 'streetAdditional'"
      class="grow"
    >
      <UInput
        v-model="streetAdditional"
        size="lg"
        :color="streetAdditional ? 'primary' : 'gray'"
        :placeholder="$t('label.siteNameOpt')"
        :aria-label="$t('label.siteNameOpt')"
        :aria-describedby="schemaPrefix + 'streetAdditional-' + addId"
        :disabled="disabledFields?.includes('streetAdditional')"
      />
      <template #help>
        <span :id="schemaPrefix + 'streetAdditional-' + addId">
          {{ $t('label.forNonCivicAddresses') }}
        </span>
      </template>
    </UFormGroup>
    <div class="flex flex-col gap-3 sm:flex-row">
      <!-- city input -->
      <ConnectFormFieldGroup
        :id="schemaPrefix + 'city'"
        v-model="city"
        class="w-full grow"
        :name="schemaPrefix + 'city'"
        :color="city ? 'primary' : 'gray'"
        :is-disabled="disabledFields?.includes('city')"
        :placeholder="$t('label.locality')"
        :aria-label="$t('label.locality')"
        :is-required="true"
      />
      <!-- region input/menu -->
      <UFormGroup
        :name="schemaPrefix + 'region'"
        class="w-full grow"
      >
        <UInput
          :model-value="'British Columbia'"
          :placeholder="$t('label.region')"
          :aria-label="$t('label.region')"
          color="primary"
          size="lg"
          data-testid="address-region-input"
          :aria-required="true"
          :disabled="true"
        />
      </UFormGroup>
      <!-- postal code input -->
      <ConnectFormFieldGroup
        :id="schemaPrefix + 'postalCode'"
        v-model="postalCode"
        v-maska="'@#@ #@#'"
        class="w-full grow"
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
        v-model="locationDescription"
        :placeholder="$t('label.additionalLocationDescription')"
        :aria-label="$t('label.additionalLocationDescription')"
        :color="locationDescription ? 'primary' : 'gray'"
        :disabled="disabledFields?.includes('locationDescription')"
        class="w-full"
        data-testid="address-location-description"
      />
    </UFormGroup>
  </div>
</template>
