<script setup lang="ts">
// @ts-ignore
import type { DatePickerRangeObject } from 'v-calendar/dist/types/src/use/datePicker'
import type { TableColumn } from '#ui/types'
import type { TableSort, Range } from '#imports'

defineProps<{
  column: TableColumn
  sort?: TableSort
  ranges: Range[]
}>()

defineEmits<{
  sort: [void]
}>()

const filterModel = defineModel<DatePickerRangeObject>({ default: { start: null, end: null } })
</script>
<template>
  <div class="flex flex-col divide-y divide-gray-300">
    <TableHeaderLabel
      :column
      :sort
      @sort="$emit('sort')"
    />
    <div class="h-[58px] p-2 font-normal">
      <DateRangePicker
        v-model="filterModel"
        :ranges
      />
    </div>
  </div>
</template>
