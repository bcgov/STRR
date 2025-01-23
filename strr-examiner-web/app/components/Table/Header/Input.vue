<script setup lang="ts">
import type { TableColumn } from '#ui/types'
import type { TableSort } from '~/types/table-sort'
defineProps<{
  column: TableColumn
  sort?: TableSort
}>()

const emit = defineEmits<{
  reset: [void]
}>()

const filterModel = defineModel({ type: String, required: true, default: '' })

function handleReset () {
  filterModel.value = ''
  emit('reset')
}
</script>
<template>
  <div class="flex flex-col divide-y divide-gray-300">
    <TableHeaderLabel
      :column
      :sort
    />
    <div class="p-2 font-normal">
      <UInput
        v-model="filterModel"
        :placeholder="column.label"
        :aria-label="column.label"
        size="sm"
        :ui="{ icon: { trailing: { pointer: '' } } }"
      >
        <template #trailing>
          <UButton
            v-show="filterModel"
            color="gray"
            variant="link"
            icon="i-heroicons-x-mark-20-solid"
            :padded="false"
            class="text-gray-900"
            @click="handleReset"
          />
        </template>
      </UInput>
    </div>
  </div>
</template>
