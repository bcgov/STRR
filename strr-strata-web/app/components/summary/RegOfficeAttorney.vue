<script setup lang="ts">
const { t } = useNuxtApp().$i18n
// TODO: may be able to share this with platforms and hosts if moved to base layer
const { strataBusiness } = storeToRefs(useStrrStrataBusinessStore())

const columns = computed(() => [
  { key: 'attorneyName', label: t('label.name') },
  { key: 'registeredOffice', label: t('label.address') }
])

</script>
<template>
  <UTable class="h-full" :rows="[strataBusiness]" :columns="columns">
    <template #attorneyName-data="{ row }">
      <ConnectInfoWithIcon
        v-if="row.regOfficeOrAtt.attorneyName"
        icon="i-mdi-account"
        :content="row.regOfficeOrAtt.attorneyName"
      />
      <p v-else>
        {{ $t('text.notEntered') }}
      </p>
    </template>
    <template #registeredOffice-data="{ row }">
      <ConnectFormAddressDisplay
        v-if="row.regOfficeOrAtt?.mailingAddress?.street"
        :address="row.regOfficeOrAtt.mailingAddress"
      />
      <p v-else>
        {{ $t('text.notEntered') }}
      </p>
    </template>
  </UTable>
</template>
