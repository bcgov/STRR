<script setup lang="ts">
const { t } = useI18n()
// TODO: may be able to share this with platforms and hosts if moved to base layer
const { strataBusiness } = storeToRefs(useStrrStrataBusinessStore())

const columns = computed(() => [
  { key: 'legalName', label: t('label.name') },
  { key: 'mailingAddress', label: t('label.mailingAddress') },
  { key: 'homeJurisdiction', label: t('label.homeJurisdiction') },
  ...(strataBusiness.value.businessNumber
    ? [{ key: 'businessNumber', label: t('label.busNum') }]
    : []
  )
])

</script>
<template>
  <UTable class="h-full" :rows="[strataBusiness]" :columns="columns">
    <template #legalName-data="{ row }">
      <div class="flex space-x-2">
        <div>
          <!-- NOTE: must be wrapped in a div to remain consistent during screen width changes -->
          <UIcon name="i-mdi-domain" class="-ml-4 text-lg" />
        </div>
        <p>{{ row.legalName }}</p>
      </div>
    </template>
    <template #mailingAddress-data="{ row }">
      <ConnectFormAddressDisplay v-if="row.mailingAddress?.country" :address="row.mailingAddress" />
    </template>
  </UTable>
</template>
