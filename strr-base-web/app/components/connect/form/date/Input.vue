<script setup lang="ts">
import {
  type MaybeElementRef,
  type UseEventBusReturn,
  onClickOutside
} from '@vueuse/core'

const formBus = inject<UseEventBusReturn<any, string> | undefined>('form-events', undefined)

const props = defineProps<{
  name: string
  initialDate?: Date,
  minDate?: Date,
  maxDate?: Date,
  placeholder?: string,
  removable?: boolean
}>()

/* eslint-disable func-call-spacing */
const emit = defineEmits<{
  (e: 'selection', value: Date | null): void,
  (e: 'remove-control', value: void): void
}>()
/* eslint-enable */

// @ts-ignore
const dateSelectPickerRef: MaybeElementRef = ref(null)
const showDatePicker = ref(false)

onClickOutside(dateSelectPickerRef, () => { showDatePicker.value = false })

const selectedDate: Ref<Date | null> = ref(props.initialDate || null)
watch(() => selectedDate.value, val => emit('selection', val))

const updateDate = (val: Date | null) => {
  selectedDate.value = val
  formBus?.emit({ type: 'blur', path: props.name })
  formBus?.emit({ type: 'change', path: props.name })
}

const selectedDateDisplay: ComputedRef<string> = computed(
  () => selectedDate.value ? dateToString(selectedDate.value, 'YYYY-MM-DD') : ''
)

const handleManualDateEntry = (input: string) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  const inputDate = dateStringToDate(input)
  const validDate = inputDate && (!props.maxDate || inputDate < props.maxDate)
  if (!input || (input.match(dateRegex) !== null && validDate)) {
    updateDate(inputDate)
    showDatePicker.value = false
  }
}
</script>

<template>
  <UFormGroup
    v-slot="{ error }"
    :name="name"
  >
    <UInput
      :ui="{ icon: { trailing: { pointer: '' } } }"
      :model-value="selectedDateDisplay"
      :placeholder="placeholder || ''"
      :color="selectedDate ? 'primary' : 'gray'"
      class="max-w-bcGovInput"
      size="lg"
      type="text"
      data-testid="date-select"
      @click="showDatePicker = true"
      @keydown.enter="showDatePicker = true"
      @update:model-value="handleManualDateEntry($event)"
    >
      <template #trailing>
        <UIcon
          v-if="removable"
          name="i-mdi-close"
          :padded="false"
          class="cursor-pointer text-xl text-blue-500"
          @click="$emit('remove-control')"
        />
        <UIcon
          name="i-mdi-calendar"
          :padded="false"
          class="cursor-pointer text-xl"
          :class="error ? 'text-red-600' : showDatePicker ? 'text-blue-500' : 'text-gray-700'"
          @click="showDatePicker = true"
        />
      </template>
    </UInput>

    <ConnectFormDatePicker
      v-if="showDatePicker"
      ref="dateSelectPickerRef"
      class="absolute z-20"
      :default-selected-date="selectedDate"
      :set-min-date="minDate"
      :set-max-date="maxDate"
      @selected-date="updateDate($event); showDatePicker = false; hasDateChanged = true"
    />
  </UFormGroup>
</template>
