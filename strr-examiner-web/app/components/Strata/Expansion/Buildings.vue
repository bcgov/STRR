<script setup lang="ts">
const { t } = useNuxtApp().$i18n
const exStore = useExaminerStore()
const { activeReg } = storeToRefs(exStore)

const { buildings } = activeReg.value.strataHotelDetails

const getBuildingLabel = (index: number) => {
  return index === 0
    ? t('strr.label.primaryBuilding').toUpperCase()
    : `${t('strr.label.building').toUpperCase()} ${index}`
}

</script>

<template>
  <CommonExpansionTemplate :label="t('strr.label.buildings')">
    <div class="flex gap-x-5">
      <div
        v-for="(building, index) in buildings"
        :key="index"
        class="space-y-2"
      >
        <b>{{ getBuildingLabel(index) }}</b>
        <ConnectInfoWithIcon
          icon="i-mdi-map-marker-outline"
          :content="displayFullAddress(building)"
        />
      </div>
    </div>
  </CommonExpansionTemplate>
</template>

<style scoped></style>
