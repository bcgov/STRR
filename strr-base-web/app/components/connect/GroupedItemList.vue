<script setup lang="ts">
import { ref, computed } from 'vue'

interface ItemGroup {
  id: string | number
  label: string
  description?: string
  items: string[]
}

type CountLabel = (count: number) => string

const props = withDefaults(defineProps<{
  groups: ItemGroup[]
  countLabel: CountLabel
  searchPlaceholder: string
  emptyText: string
  searchMinItems?: number
}>(), { searchMinItems: 12 })

const totalCount = computed(() => props.groups.reduce((sum, group) => sum + group.items.length, 0))

const query = ref('')
const visibleGroups = computed(() => {
  const search = query.value.trim().toLowerCase()
  if (!search) {
    return props.groups
  }
  return props.groups
    .map(group => ({ ...group, items: group.items.filter(item => item.toLowerCase().includes(search)) }))
    .filter(group => group.items.length > 0)
})
</script>

<template>
  <div
    data-testid="grouped-item-list"
    class="space-y-5 rounded border border-gray-200 p-5"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <span
        data-testid="grouped-item-list-total"
        class="text-bcGovColor-midGray"
      >
        {{ countLabel(totalCount) }}
      </span>
      <UInput
        v-if="totalCount > searchMinItems"
        v-model="query"
        data-testid="grouped-item-list-search"
        class="w-56"
        icon="i-mdi-magnify"
        size="sm"
        :placeholder="searchPlaceholder"
        :aria-label="searchPlaceholder"
      />
    </div>

    <div
      v-for="group in visibleGroups"
      :key="group.id"
      :data-testid="`grouped-item-list-group-${group.id}`"
      class="space-y-2"
    >
      <div class="flex items-baseline gap-2">
        <b>{{ group.label }}</b>
        <span class="text-xs text-bcGovColor-midGray">({{ countLabel(group.items.length) }})</span>
      </div>
      <slot
        name="description"
        :group="group"
      >
        <p
          v-if="group.description"
          class="text-bcGovColor-midGray"
        >
          {{ group.description }}
        </p>
      </slot>
      <ul class="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
        <li
          v-for="(item, index) in group.items"
          :key="`${item}-${index}`"
          class="truncate rounded border border-gray-200 bg-gray-50 px-2 py-1 text-center text-xs font-medium"
          :title="item"
        >
          {{ item }}
        </li>
      </ul>
    </div>

    <p
      v-if="!visibleGroups.length"
      data-testid="grouped-item-list-empty"
      class="py-4 text-center text-gray-500"
    >
      {{ emptyText }}
    </p>
  </div>
</template>
