<script setup lang="ts">
const { t } = useI18n()
// TODO: may be able to share this with platforms and hosts if moved to base layer
const { strataBusiness } = storeToRefs(useStrrStrataBusinessStore())

const columns = computed(() => [
  ...(strataBusiness.value.regOfficeOrAtt?.attorneyName
    ? [{ key: 'attorneyName', label: t('label.name') }]
    : []
  ),
  { key: 'registeredOffice', label: t('label.address') }
])

</script>
<template>
  <UTable class="h-full" :rows="[strataBusiness]" :columns="columns">
    <template #attorneyName-data="{ row }">
      <div class="flex space-x-2">
        <div>
          <!-- NOTE: must be wrapped in a div to remain consistent during screen width changes -->
          <UIcon name="i-mdi-domain" class="-ml-4 text-lg" />
        </div>
        <p>{{ row.regOfficeOrAtt.attorneyName }}</p>
      </div>
    </template>
    <template #registeredOffice-data="{ row }">
      <ConnectFormAddressDisplay
        v-if="row.regOfficeOrAtt?.mailingAddress?.country"
        :address="row.regOfficeOrAtt.mailingAddress"
      />
    </template>
  </UTable>
</template>
