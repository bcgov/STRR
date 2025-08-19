<script setup lang="ts">

const { t } = useI18n()
const { preDefinedConditions } = useExaminerDecision()

const selectedConditions = defineModel<string[]>('conditions', { required: true })
const customCondition = defineModel<string>('customCondition', { required: true })
const minBookingDays = defineModel<number | null>('minBookingDays', { required: true })

const isCustomConditionOpen = ref(false)
const customConditionText = ref('') // used to capture custom condition in textarea before updating the custom condition model prop
const hasCustomConditionError = ref(false)
const minBookingDaysNum = ref(28)
const isMinimumBookingDaysOpen = ref(false)

const isSelected = (item: string) => selectedConditions.value.includes(item)

const removeItem = (item: string) => {
  // remove first occurrence of conditions that has exactly same name (for custom conditions)
  const index = selectedConditions.value.indexOf(item)
  if (index !== -1) {
    selectedConditions.value.splice(index, 1)
  }
  if (item === 'minBookingDays') {
    minBookingDays.value = null
    minBookingDaysNum.value = 28 // reset default value
  }
}

const openCustomCondition = (): void => {
  customCondition.value = ''
  customConditionText.value = ''
  isCustomConditionOpen.value = true
  hasCustomConditionError.value = false
}

const addCustomCondition = (): void => {
  if (customConditionText.value.length === 0 || customConditionText.value.length > 256) {
    hasCustomConditionError.value = true
  } else {
    hasCustomConditionError.value = false
    customCondition.value = customConditionText.value
    isCustomConditionOpen.value = false
  }
}

const removeCustomCondition = (): void => {
  customCondition.value = ''
  isCustomConditionOpen.value = false
}

// label of the badge in the custom conditions select menu
const getConditionLabel = (item: string) => {
  return preDefinedConditions.includes(item)
    ? t(`approvalConditions.${item}`)
    : t('label.customConditionShort')
}

const customConditionCount = computed(() =>
  selectedConditions.value
    .filter(condition => !preDefinedConditions.includes(condition))
    .length
)

const isMinBookingDaysSelected = computed((): boolean =>
  selectedConditions.value.includes('minBookingDays')
)

const addMinBookingDays = () => {
  minBookingDays.value = minBookingDaysNum.value
  isMinimumBookingDaysOpen.value = false
}

const removeMinBookingDays = (): void => {
  isMinimumBookingDaysOpen.value = false
  removeItem('minBookingDays')
  minBookingDays.value = null
  minBookingDaysNum.value = 28
}

watch(isMinBookingDaysSelected, (selected) => {
  if (selected) {
    isMinimumBookingDaysOpen.value = true
    removeCustomCondition()
  } else {
    isMinimumBookingDaysOpen.value = false
  }
})

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
              :label="getConditionLabel(item)"
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
    <UButton
      variant="ghost"
      class="mt-1"
      :disabled="isCustomConditionOpen || customConditionCount >= 3 || isMinimumBookingDaysOpen"
      data-testid="open-custom-condition-button"
      @click="openCustomCondition()"
    >
      <UIcon name="i-mdi-add" />
      {{ t('label.customCondition') }}
    </UButton>
    <div
      v-if="isCustomConditionOpen"
      class="mt-4 flex gap-x-2 align-bottom"
      data-testid="custom-condition"
    >
      <UFormGroup
        :description="t('label.addCustomCondition')"
        :error="hasCustomConditionError && t('error.examinerDecisions.enterCustomCondition')"
        class="w-9/12"
        :ui="{
          description: 'mb-[5px] text-[#212529]'}
        "
      >
        <UTextarea
          v-model="customConditionText"
          data-testid="custom-condition-input"
          color="gray"
          class="text-bcGovColor-midGray focus:ring-0"
          :ui="{ base: 'min-h-[60px] h-[60px] pt-6 pl-5' }"
          autofocus
          resize
        />
      </UFormGroup>

      <UButton
        class="mt-6 h-[60px] w-2/12 justify-center"
        label="Add"
        data-testid="add-custom-condition-button"
        @click="addCustomCondition"
      />
      <UButton
        class="mt-6 h-[60px] w-1/12 justify-center"
        color="gray"
        variant="ghost"
        icon="i-mdi-delete-outline"
        data-testid="remove-custom-condition-button"
        @click="removeCustomCondition"
      />
    </div>
    <div
      v-if="isMinBookingDaysSelected && isMinimumBookingDaysOpen"
      class="mt-4 flex w-7/12 gap-x-2 align-bottom"
      data-testid="min-booking-days"
    >
      <UFormGroup
        :description="t('label.minBookingDays')"
        class="w-8/12"
        :ui="{
          description: 'mb-[5px] text-[#212529]'}
        "
      >
        <UInput
          v-model="minBookingDaysNum"
          type="number"
        />
      </UFormGroup>
      <UButton
        class="mt-6 h-[60px] w-3/12 justify-center"
        label="Add"
        data-testid="add-min-book-days-button"
        @click="addMinBookingDays"
      />
      <UButton
        class="mt-6 h-[60px] w-1/12 justify-center"
        color="gray"
        variant="ghost"
        icon="i-mdi-delete-outline"
        data-testid="remove-min-book-days-button"
        @click="removeMinBookingDays"
      />
    </div>
  </div>
</template>

<style scoped>

</style>
