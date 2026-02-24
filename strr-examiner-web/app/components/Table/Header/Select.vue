<script setup lang="ts">
import type { TableColumn } from '#ui/types'
import type { TableSort } from '~/types/table-sort'
const { t } = useNuxtApp().$i18n
const props = defineProps<{
  column: TableColumn
  options: Array<{
    label: string
    value: any
    disabled?: boolean
    childStatuses?: any[]
  }>
  sort?: TableSort
  searchable?: boolean
  default?: Array<any>
  disable?: boolean
}>()

defineEmits<{
  sort: [void]
}>()

const filterModel = defineModel({ type: Array<any>, required: true, default: [] })

const fullOptions = computed(() => {
  return props.options
})

const displayLabel = computed(() => {
  if (filterModel.value.length === 0) {
    return props.column.label
  }
  if (filterModel.value.length > 1) {
    return t('label.multipleFilter')
  }
  const selectedOption = props.options.find(opt => opt.value === filterModel.value[0])
  return selectedOption?.label ?? props.column.label
})

const clearFilter = () => {
  filterModel.value = props.default ?? []
}

// parent-child toggle logic for grouped options
const parentOptions = computed(() => props.options.filter(option => option.childStatuses?.length))
const isUpdatingFilter = ref(false)

// used to style the child statuses
const isChildStatus = (value: any) => parentOptions.value.some(p => p.childStatuses?.includes(value))

// Sync parent/child checkboxes: toggling a parent checks/unchecks all its children,
// and checking all children automatically checks the parent (and vice versa).
// isUpdatingFilter prevents the watcher from re-triggering on its own updates.
watch(filterModel, (newVal, oldVal) => {
  const parents = parentOptions.value
  if (isUpdatingFilter.value || !parents.length) { return } // skip re-entrant calls and flat option lists
  isUpdatingFilter.value = true

  const prev = new Set(oldVal) // previous selection, used to detect what changed
  const result = new Set(newVal) // mutable working copy of the new selection

  for (const { value: parentVal, childStatuses } of parents) {
    const parentChecked = result.has(parentVal) && !prev.has(parentVal)
    const parentUnchecked = !result.has(parentVal) && prev.has(parentVal)
    const allChildrenSelected = childStatuses!.every(status => result.has(status))

    if (parentChecked) {
      childStatuses!.forEach(status => result.add(status)) // check all child statuses
    } else if (parentUnchecked) {
      childStatuses!.forEach(status => result.delete(status)) // uncheck all child statuses
    } else if (allChildrenSelected) {
      result.add(parentVal) // if all children checked - auto-check parent
    } else {
      result.delete(parentVal) // if some child unchecked - uncheck parent
    }
  }

  filterModel.value = [...result]
  nextTick(() => { isUpdatingFilter.value = false }) // wait for DOM updates before re-enabling the watcher
})

// used to check if any child statuses selected to set indeterminate state for ui checkbox
const isPartiallySelected = (option: { childStatuses?: any[] }) => {
  if (!option.childStatuses?.length) { return false }
  const selected = new Set(filterModel.value)
  const someSelected = option.childStatuses.some(status => selected.has(status))
  const allSelected = option.childStatuses.every(status => selected.has(status))
  return someSelected && !allSelected
}

const filterColumnRef = ref<any>(null)
const initialWidth = ref<string>('auto')

onMounted(() => {
  nextTick(() => {
    if (filterColumnRef.value) {
      const measuredWidth = Math.round(filterColumnRef.value.$el.getBoundingClientRect().width)
      initialWidth.value = measuredWidth > 200 ? '200px' : `${measuredWidth}px`
    }
  })
})
</script>
<template>
  <div class="flex flex-col divide-y divide-gray-300">
    <TableHeaderLabel
      :column
      :sort
      @sort="$emit('sort')"
    />
    <div class="h-[58px] p-2 font-normal">
      <template v-if="props.disable">
        <UButton
          variant="select_menu_trigger"
          class="w-full flex-1 justify-between"
          disabled
          :label="displayLabel"
          trailing-icon="i-mdi-lock"
          :ui="{ label: 'text-center truncate flex-grow-0' }"
        />
      </template>
      <USelectMenu
        v-else
        v-model="filterModel"
        :options="fullOptions"
        selected-icon=""
        value-attribute="value"
        option-attribute="label"
        multiple
        :searchable
        clear-search-on-close
      >
        <template #default="{ open }">
          <UButton
            ref="filterColumnRef"
            variant="select_menu_trigger"
            class="flex-1 justify-between"
            :class="{
              'border-b-2 border-blue-500': open || filterModel.length > 0
            }"
            :style="{ width: initialWidth }"
            :ui="{
              trailing: {
                wrapper: 'shrink-0 flex-grow-0 justify-end'
              }
            }"
          >
            <span class="truncate">{{ displayLabel }}</span>
            <template #trailing>
              <UIcon
                name="i-mdi-caret-down"
                class="size-5 shrink-0 text-gray-700 transition-transform"
                :class="[open && 'rotate-180']"
              />
              <UButton
                v-if="filterModel.length > 0"
                variant="ghost"
                size="sm"
                icon="i-mdi-close"
                class="-ml-5 text-blue-500 hover:text-blue-700"
                @click="clearFilter"
              />
            </template>
          </UButton>
        </template>
        <template #option="{ option, selected }">
          <div
            v-if="option.value === undefined && option.disabled"
            class="w-full px-4 py-2 opacity-100"
          >
            <span>{{ option.label }}</span>
          </div>
          <div
            v-else
            class="flex cursor-pointer items-center gap-1 p-1"
            :class="{ 'pl-5': isChildStatus(option.value) }"
          >
            <UCheckbox
              :model-value="selected"
              :indeterminate="isPartiallySelected(option)"
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
