<script setup lang="ts">
import type { TableColumn } from '#ui/types'
import type { TableSort } from '~/types/table-sort'
defineProps<{
  column: TableColumn
  sort?: TableSort
}>()
</script>
<template>
  <div class="flex h-14 items-center">
    <button
      v-if="column.sortable && sort?.column === column.key"
      class="inline-flex size-full items-center justify-between p-2 ring-inset
      ring-blue-500 focus-within:ring-2 hover:bg-gray-300 focus:outline-none "
    >
      <span class="text-gray-900">{{ column.label }}</span>
      <UIcon
        name="i-mdi-arrow-down"
        class="size-5 shrink-0 text-gray-900"
      />
    </button>
    <span
      v-else
      class="w-full p-2 text-[#757575]"
    >
      {{ column.label }}
    </span>
  </div>
</template>
