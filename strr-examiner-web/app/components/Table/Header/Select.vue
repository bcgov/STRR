<script setup lang="ts">
import type { TableColumn } from '#ui/types'
import type { TableSort } from '~/types/table-sort'
const props = defineProps<{
  column: TableColumn
  options: Array<{
    label: string
    value: any
    disabled?: boolean
  }>
  sort?: TableSort
  searchable?: boolean
  default?: Array<any>
}>()

defineEmits<{
  sort: [void]
}>()

const filterModel = defineModel({ type: Array<any>, required: true, default: [] })

const fullOptions = computed(() => {
  const options = props.options
  options.push({ label: 'Clear Filter', value: 'reset', disabled: !filterModel.value.length })
  return options
})

function onChange (e: string[]) {
  if (e.includes('reset')) {
    filterModel.value = props.default ?? []
  }
}
</script>
<template>
  <div class="flex flex-col divide-y divide-gray-300">
    <TableHeaderLabel
      :column
      :sort
      @sort="$emit('sort')"
    />
    <div class="h-[58px] p-2 font-normal">
      <USelectMenu
        v-model="filterModel"
        :options="fullOptions"
        selected-icon=""
        value-attribute="value"
        option-attribute="label"
        multiple
        :searchable
        clear-search-on-close
        @change="onChange"
      >
        <template #default="{ open }">
          <!-- TODO: aria labels? -->
          <UButton
            variant="select_menu_trigger"
            class="flex-1 justify-between text-gray-700"
          >
            {{ column.label }}
            <UIcon
              name="i-mdi-caret-down"
              class="size-5 shrink-0 text-gray-700 transition-transform"
              :class="[open && 'rotate-180']"
            />
          </UButton>
        </template>
        <template #option="{ option, selected }">
          <div
            v-if="option.value === 'reset'"
            class="inline-flex w-full items-center gap-2 border-t border-gray-300 px-4 py-2"
            :class="filterModel.length ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'"
          >
            <UIcon
              name="i-mdi-close"
              class="size-4 shrink-0 text-blue-500"
            />
            <span class="text-blue-500">Clear Filter</span>
          </div>
          <div
            v-else-if="option.value === undefined && option.disabled"
            class="w-full border-t border-gray-300 px-4 py-2 opacity-100"
          >
            <span>{{ option.label }}</span>
          </div>
          <div
            v-else
            class="flex cursor-pointer items-center gap-2 px-4 py-2"
          >
            <UCheckbox
              :model-value="selected"
              class="pointer-events-none"
              :ui="{
                base: 'h-4 w-4',
                rounded: 'rounded-sm',
                border: 'border border-gray-500'
              }"
            />
            <span>{{ option.label }}</span>
          </div>
        </template>
      </USelectMenu>
    </div>
  </div>
</template>
<!-- ui prop not overriding correctly -->
<style scoped>
:deep([role="option"]) {
  padding: 0;
}

:deep(input[type="text"]) {
  @apply block w-[calc(100%+0.5rem)] focus:ring-transparent text-sm px-3 py-1.5 text-gray-700 bg-white;
  @apply dark:bg-gray-800 border-0 border-b border-gray-200 sticky -top-1 -mt-1 mb-1 -mx-1 z-10;
  @apply placeholder-gray-400 focus:outline-none;
}

:deep([role="option"][aria-disabled="true"]) {
  opacity: 1;
  cursor: default;
  font-weight: 900;
}
</style>
