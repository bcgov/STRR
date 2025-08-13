<script setup lang="ts">
const { t } = useI18n()

const selectedConditions = defineModel<string[]>({ required: true })

const preDefinedConditions = [
  'principalResidence',
  'validBL',
  'minBookingDays',
  'class9FarmLand',
  'partOfStrataHotel',
  'fractionalOwnership'
]

const isSelected = (item: string) => selectedConditions.value.includes(item)

const removeItem = (item: string) => {
  selectedConditions.value = selectedConditions.value.filter(i => i !== item)
}

</script>

<template>
  <div data-testid="approval-conditions">
    <USelectMenu
      v-model="selectedConditions"
      multiple
      :options="preDefinedConditions"
      selected-icon=""
      class="w-full"
      :ui-menu="{
        option:{
          padding: 'py-2.5'
        }
      }"
    >
      <UButton
        class="relative flex h-fit min-h-[60px] w-full items-center border-b border-[#495057] px-4"
        variant="combobox"
      >
        <span
          v-if="selectedConditions && selectedConditions.length === 0"
          class="w-full text-left"
        >
          {{ t('label.approvalConditions') }}
        </span>
        <div v-else class="flex flex-col justify-between">
          <span class="mb-1 text-left text-xs">
            {{ t('label.approvalConditions') }}
          </span>
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="(item, index) in selectedConditions"
              :key="index"
              :label="t(`approvalConditions.${item}`)"
              class="z-30 float-left flex font-bold uppercase"
            >
              <template #trailing>
                <UIcon
                  name="i-mdi-close"
                  class="p-0"
                  @click.stop.prevent="removeItem(item)"
                />
              </template>
            </UBadge>
          </div>
        </div>
        <UIcon
          name="i-mdi-chevron-down"
          class="ml-auto size-5 shrink-0 text-gray-700"
        />
      </UButton>
      <template #option="{ option: item }">
        <div class="w-full px-2">
          <span>{{ t(`approvalConditions.${item}`) }}</span>
          <span v-if="isSelected(item)" class="float-right">
            <UIcon name="i-mdi-check" />
            {{ t('label.combobox.selected') }}
          </span>
          <span v-else class="float-right">
            <UIcon name="i-mdi-add" />
            {{ t('label.combobox.select') }}
          </span>
        </div>
      </template>
    </USelectMenu>
  </div>
</template>

<style scoped>

</style>
