<script setup lang="ts">
const { t } = useI18n()
// TODO: may be able to share this with platforms and hosts if moved to base layer
const { strataBusiness } = storeToRefs(useStrrStrataBusinessStore())

const columns = computed(() => [
  { key: 'legalName', label: t('label.name') },
  { key: 'mailingAddress', label: t('label.mailingAddress') },
  { key: 'homeJurisdiction', label: t('label.homeJurisdiction') },
  { key: 'businessNumber', label: t('label.busNum') }
])

</script>
<template>
  <UTable class="h-full" :rows="[strataBusiness]" :columns="columns">
    <template #legalName-data="{ row }">
      <ConnectInfoWithIcon icon="i-mdi-domain" :content="row.legalName" />
    </template>
    <template #mailingAddress-data="{ row }">
      <ConnectFormAddressDisplay :address="row.mailingAddress" />
    </template>
    <template #homeJurisdiction-data="{ row }">
      <p>{{ row.homeJurisdiction || $t('text.notEntered') }}</p>
    </template>
    <template #businessNumber-data="{ row }">
      <p>{{ row.businessNumber || $t('text.notEntered') }}</p>
    </template>
  </UTable>
</template>
