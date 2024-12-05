<script setup lang="ts">
defineProps<{ items: ConnectInfoTableItem[], minItemWidth?: string }>()

const headers = [
  { key: 'label' },
  { key: 'info' }
]

</script>
<template>
  <UTable
    :rows="items"
    :columns="headers"
    :ui="{
      wrapper: 'h-full',
      base: 'min-w-0',
      td: {
        base: 'min-w-[200px] last:w-full',
        padding: 'px-0'
      },
      th: { padding: 'p-0' },
      divide: 'divide-none',
      tbody: 'divide-none'
    }"
  >
    <template #label-data="{ row }: { row: ConnectInfoTableItem }">
      <slot :name="'label-' + row.slot" :row="row">
        <p class="font-bold text-gray-900">
          {{ row.label }}
        </p>
        <p v-if="row.subLabel" class="text-xs text-gray-700">
          {{ row.subLabel }}
        </p>
      </slot>
    </template>
    <template #info-data="{ row }: { row: ConnectInfoTableItem }">
      <div class="ml-4">
        <slot :name="'info-' + row.slot" :row="row">
          <p>
            {{ row.info }}
          </p>
        </slot>
      </div>
    </template>
  </UTable>
</template>
