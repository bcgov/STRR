<script setup lang="ts">
const { t } = useI18n()
const props = defineProps<{
  address: Partial<ConnectAddress>,
  useLocationDescLabel?: boolean
}>()

const columns = [
  { key: 'label' },
  { key: 'value' }
]

const addressRows = computed(() => {
  const rows = []

  if (props.address.unitNumber) {
    rows.push({ label: t('label.unitNumber'), value: props.address.unitNumber })
  }

  if (props.address.streetNumber) {
    rows.push({ label: t('label.streetNumber'), value: props.address.streetNumber })
  }

  if (props.address.streetName) {
    rows.push({ label: t('label.streetName'), value: props.address.streetName })
  }

  if (props.address.streetAdditional) {
    rows.push({ label: t('label.streetAdditional'), value: props.address.streetAdditional })
  }

  if (props.address.city) {
    rows.push({ label: t('label.city'), value: props.address.city })
  }

  if (props.address.postalCode) {
    rows.push({ label: t('label.postalCode'), value: props.address.postalCode })
  }

  return rows
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
