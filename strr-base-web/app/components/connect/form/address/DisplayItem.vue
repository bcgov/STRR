<script setup lang="ts">
const { t } = useNuxtApp().$i18n
const props = defineProps<{
  address: Partial<ConnectAddress>,
  useLocationDescLabel?: boolean
}>()

const columns = [
  { key: 'label' },
  { key: 'value' }
]

const addressRows = computed(() => {
  const addressFields = {
    unitNumber: 'unitNumber',
    streetNumber: 'streetNumber',
    streetName: 'streetName',
    streetAdditional: 'streetAdditional',
    city: 'city',
    region: 'province',
    postalCode: 'postalCode'
  }

  return Object.entries(addressFields)
    .filter(([field]) => props.address[field])
    .map(([field, label]) => ({
      label: t(`label.${label}`),
      value: props.address[field]
    }))
})

</script>
<template>
  <div>
    <ConnectI18nHelper
      translation-path="text.hostDashboardAddressBreakdown"
      v-bind="{ newLine: '<br/>', boldStart: '<strong>', boldEnd: '</strong>' }"
    />
    <div data-testid="address-breakdown-display">
      <UTable
        :rows="addressRows"
        :columns="columns"
        :ui="{
          wrapper: 'h-full',
          base: 'min-w-0',
          td: {
            base: 'min-w-[150px] last:w-full',
            padding: 'py-1 px-0'
          },
          th: {
            padding: 'py-1 px-0',
            base: 'sr-only'
          },
          divide: 'divide-none',
          tbody: 'divide-none'
        }"
      >
        <template #label-data="{ row }">
          <span class="font-semibold">{{ row.label }}:</span>
        </template>
        <template #value-data="{ row }">
          {{ row.value }}
        </template>
      </UTable>
      <ConnectInfoBox
        v-if="address.locationDescription"
        class="mt-2"
        :content="address.locationDescription"
        :title="useLocationDescLabel ? $t('label.locationDescription') : $t('label.deliveryInstructions')"
        data-testid="location-description"
      />
    </div>
  </div>
</template>
