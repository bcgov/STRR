<script setup lang="ts">
// @ts-ignore
import type { DatePickerRangeObject } from 'v-calendar/dist/types/src/use/datePicker'
import type { TableColumn } from '#ui/types'
import type { TableSort, Range } from '#imports'

const { disable } = defineProps<{
  column: TableColumn
  sort?: TableSort
  ranges: Range[]
  disable?: boolean
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
      <template v-if="disable">
        <UButton
          variant="select_menu_trigger"
          class="flex-1 justify-between"
          disabled
        >
          <span class="truncate">{{ column.label }}</span>
          <UIcon
            name="i-mdi-lock"
            class="size-5 shrink-0 text-gray-500"
          />
        </UButton>
      </template>
      <DateRangePicker
        v-else
        v-model="filterModel"
        :ranges
      />
    </div>
  </div>
</template>
