<script setup lang="ts">
// https://ui.nuxt.com/components/date-picker#daterangepicker
import { DatePicker as VCalendarDatePicker } from 'v-calendar'
// @ts-ignore
import type { DatePickerRangeObject } from 'v-calendar/dist/types/src/use/datePicker'
import 'v-calendar/dist/style.css'
import isEqual from 'lodash/isEqual'
import { sub, isSameDay, startOfDay, endOfDay } from 'date-fns'
import { type Range } from '#imports'

const isSmallScreen = useMediaQuery('(max-width: 640px)')

const props = defineProps<{
  ranges: Range[]
}>()

const fullRanges = computed<Range[]>(() => [
  { label: 'All', duration: { start: null, end: null } },
  ...props.ranges
])

const dateModel = defineModel<DatePickerRangeObject>({ default: { start: null, end: null } })

const todayAttrs = ref([{
  key: 'today',
  dates: new Date(),
  highlight: {
    color: 'primary',
    fillMode: 'outline'
  }
}])

const attrs = {
  transparent: true,
  borderless: true,
  color: 'primary',
  'is-dark': false,
  'first-day-of-week': 2
}

function isRangeSelected (range: Range): boolean {
  if ('start' in range.duration && 'end' in range.duration) {
    const duration = range.duration as CustomDuration

    // handle 'All'
    if (duration.start === null && duration.end === null) {
      return isEqual(dateModel.value, { start: range.duration.start, end: range.duration.end })
    }

    // null check to compare custom dates
    if (
      duration.start &&
      duration.end &&
      dateModel.value.start &&
      dateModel.value.end
    ) {
      return (
        isSameDay(dateModel.value.start, duration.start) &&
        isSameDay(dateModel.value.end, duration.end)
      )
    }

    // false if custom range and didnt match any of the above
    return false
  }
  return (
    isSameDay(dateModel.value.start, sub(new Date(), range.duration)) &&
    isSameDay(dateModel.value.end, new Date())
  )
}

function selectRange (range: Range) {
  if ('start' in range.duration && 'end' in range.duration) {
    dateModel.value = range.duration
  } else {
    dateModel.value = { start: startOfDay(sub(new Date(), range.duration)), end: new Date() }
  }
}

// child may emit null so reset datemodel start/end properties
// normalize start/end dates to be start of day and end of day
function normalizeDate (e: DatePickerRangeObject | null) {
  if (e === null) {
    dateModel.value = { start: null, end: null }
  } else {
    dateModel.value = {
      start: e.start ? startOfDay(e.start) : null,
      end: e.end ? endOfDay(e.end) : null
    }
  }
}

function onDayClick (_: any, event: MouseEvent): void {
  const target = event.target as HTMLElement
  target.blur()
}

const buttonLabel = computed(() => {
  if (isEqual(dateModel.value, { start: null, end: null })) {
    return 'All'
  }

  const matchedRange = fullRanges.value.find(range => isRangeSelected(range))

  return matchedRange ? matchedRange.label : 'Custom'
})
</script>
<template>
  <UPopover
    :popper="{ placement: 'bottom-start' }"
  >
    <button
      class="flex h-[40px] w-full items-center justify-between rounded-t border-b border-gray-500 bg-gray-100
    px-2.5 py-1.5 hover:border-gray-600 hover:bg-gray-200 focus-visible:border-b-2 focus-visible:border-blue-500"
    >
      <span class="text-gray-700">{{ buttonLabel }}</span>
      <UIcon
        name="i-mdi-calendar"
        class="size-4 shrink-0 text-gray-700"
      />
    </button>

    <template #panel="{ close }">
      <div class="flex items-center divide-gray-200 sm:divide-x dark:divide-gray-800">
        <div class="hidden flex-col py-4 sm:flex">
          <UButton
            v-for="(range, index) in fullRanges"
            :key="index"
            :label="range.label"
            color="gray"
            variant="ghost"
            class="rounded-none px-6"
            :class="[
              isRangeSelected(range)
                ? 'bg-gray-100 dark:bg-gray-800'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
            ]"
            truncate
            @click="selectRange(range)"
          />
        </div>
        <VCalendarDatePicker
          v-model.range="dateModel"
          :columns="isSmallScreen ? 1 : 2"
          :attributes="todayAttrs"
          v-bind="{ ...attrs, ...$attrs }"
          @dayclick="onDayClick"
          @update:model-value="(e) => {
            normalizeDate(e)
            close()
          }"
        />
      </div>
    </template>
  </UPopover>
</template>
<style>
:root {
  --vc-gray-50: rgb(var(--color-gray-50));
  --vc-gray-100: rgb(var(--color-gray-100));
  --vc-gray-200: rgb(var(--color-gray-200));
  --vc-gray-300: rgb(var(--color-gray-300));
  --vc-gray-400: rgb(var(--color-gray-400));
  --vc-gray-500: rgb(var(--color-gray-500));
  --vc-gray-600: rgb(var(--color-gray-600));
  --vc-gray-700: rgb(var(--color-gray-700));
  --vc-gray-800: rgb(var(--color-gray-800));
  --vc-gray-900: rgb(var(--color-gray-900));
}

.vc-primary {
  --vc-accent-50: rgb(var(--color-primary-50));
  --vc-accent-100: rgb(var(--color-primary-50));
  --vc-accent-200: rgb(var(--color-primary-100));
  --vc-accent-300: rgb(var(--color-primary-300));
  --vc-accent-400: rgb(var(--color-primary-400));
  --vc-accent-500: rgb(var(--color-primary-500));
  --vc-accent-600: rgb(var(--color-primary-500));
  --vc-accent-700: rgb(var(--color-primary-500));
  --vc-accent-800: rgb(var(--color-primary-500));
  --vc-accent-900: rgb(var(--color-primary-500));
}
</style>
