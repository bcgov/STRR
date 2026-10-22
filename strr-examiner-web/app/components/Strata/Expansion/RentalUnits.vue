<script setup lang="ts">
const { t } = useNuxtApp().$i18n
const { activeReg } = storeToRefs(useExaminerStore())

const groups = computed(() => {
  const { unitListings, location, buildings } = activeReg.value.strataHotelDetails
  // unit group n pairs with addresses[n]: the primary location, then each additional building
  const addresses = [location, ...buildings]
  return formatStrataUnitGroups(unitListings).map(({ building, items }) => ({
    id: building,
    items,
    label: building
      ? `${t('strr.label.building').toUpperCase()} ${building + 1}`
      : t('strr.label.primaryBuilding').toUpperCase(),
    description: displayFullAddress(addresses[building])
  }))
})

const unitCount = (count: number) => t('strr.label.unitCount', count)
</script>

<template>
  <CommonExpansionTemplate :label="t('strr.label.rentalUnits')">
    <ConnectGroupedItemList
      class="mr-6"
      :groups="groups"
      :count-label="unitCount"
      :search-placeholder="t('strr.label.searchUnits')"
      :empty-text="t('strr.label.noMatchingUnits')"
    >
      <template #description="{ group }">
        <ConnectInfoWithIcon
          v-if="group.description"
          icon="i-mdi-map-marker-outline"
          :content="group.description"
        />
      </template>
    </ConnectGroupedItemList>
  </CommonExpansionTemplate>
</template>
