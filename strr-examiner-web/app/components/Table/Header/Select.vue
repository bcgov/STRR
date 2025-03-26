<script setup lang="ts">
import type { TableColumn } from '#ui/types'
import type { TableSort } from '~/types/table-sort'
const { t } = useI18n()
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

const filterColumnRef = ref<any>(null)
const initialWidth = ref<string>('auto')

onMounted(() => {
  nextTick(() => {
    if (filterColumnRef.value) {
      const measuredWidth = Math.round(filterColumnRef.value.$el.getBoundingClientRect().width)
      initialWidth.value = `${measuredWidth}px`
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
          <!-- TODO: aria labels? -->
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
            class="w-full border-t border-gray-300 px-4 py-2 opacity-100"
          >
            <span>{{ option.label }}</span>
          </div>
          <div
            v-else
            class="flex cursor-pointer items-center gap-2 p-1"
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
