<script setup lang="ts" generic="T = string">
import { ref, computed } from 'vue'
import { useTimeoutFn } from '@vueuse/core'
import ModalBase from '../modal/Base.vue'

export interface ItemListGroup<Item = string> {
  label?: string
  items: Item[]
}

const props = withDefaults(defineProps<{
  label?: string
  items?: T[] | ItemListGroup<T>[] | null
  itemFormatter?:(item: T) => string
  title?: string
  maxPreview?: number
  itemLabel?: string
  itemLabelPlural?: string
  allowCopy?: boolean
  allowSearch?: boolean
  emptyText?: string
  dataTestid?: string
}>(), {
  label: '',
  items: () => [],
  itemFormatter: (item: T) => String(item ?? '').trim(),
  title: '',
  maxPreview: 6,
  itemLabel: 'unit',
  itemLabelPlural: '',
  allowCopy: true,
  allowSearch: true,
  emptyText: '',
  dataTestid: 'item-list-display'
})

const isModalOpen = ref(false)
const searchQuery = ref('')
const copied = ref(false)
const { start: resetCopied } = useTimeoutFn(() => { copied.value = false }, 2000, { immediate: false })

const isGroupArray = (val: unknown[]): val is ItemListGroup<T>[] =>
  val.length > 0 && typeof val[0] === 'object' && val[0] !== null && 'items' in val[0]

const parsedGroups = computed<ItemListGroup<T>[]>(() => {
  if (!props.items?.length) {
    return []
  }
  const rawGroups = isGroupArray(props.items) ? props.items : [{ items: props.items as T[] }]
  return rawGroups
    .map(g => ({ label: g.label, items: (g.items || []).filter(i => props.itemFormatter(i).length > 0) }))
    .filter(g => g.items.length > 0)
})

const allItems = computed<T[]>(() => parsedGroups.value.flatMap(g => g.items))
const totalCount = computed(() => allItems.value.length)
const previewItems = computed(() => allItems.value.slice(0, props.maxPreview))
const remainingCount = computed(() => Math.max(0, totalCount.value - props.maxPreview))
const pluralLabel = computed(() => props.itemLabelPlural || `${props.itemLabel}s`)
const countSuffix = computed(() => (totalCount.value === 1 ? props.itemLabel : pluralLabel.value))

const filteredGroups = computed<ItemListGroup<T>[]>(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) {
    return parsedGroups.value
  }
  return parsedGroups.value
    .map(g => ({ ...g, items: g.items.filter(i => props.itemFormatter(i).toLowerCase().includes(query)) }))
    .filter(g => g.items.length > 0)
})

const filteredCount = computed(() => filteredGroups.value.reduce((sum, g) => sum + g.items.length, 0))

const copyAll = async () => {
  if (!totalCount.value) {
    return
  }
  const text = parsedGroups.value.length > 1
    ? parsedGroups.value
      .map(g => `${g.label ? `${g.label}:\n` : ''}${g.items.map(props.itemFormatter).join('\n')}`)
      .join('\n\n')
    : allItems.value.map(props.itemFormatter).join('\n')

  await navigator?.clipboard?.writeText?.(text).catch(() => {})
  copied.value = true
  resetCopied()
}
</script>

<template>
  <div
    v-if="totalCount > 0 || label || emptyText"
    :data-testid="totalCount > 0 ? dataTestid : (emptyText ? `${dataTestid}-empty` : undefined)"
    class="space-y-2"
  >
    <div
      class="flex flex-wrap items-baseline gap-1.5"
      :data-testid="totalCount > 0 ? `${dataTestid}-toolbar` : undefined"
    >
      <b v-if="label">{{ label }}</b>
      <span
        v-if="totalCount > 0"
        :data-testid="`${dataTestid}-total-count`"
        class="text-xs font-normal text-bcGovColor-midGray"
      >
        ({{ totalCount }} {{ countSuffix }})
      </span>
      <span
        v-else-if="emptyText"
        class="text-sm text-gray-500"
      >
        {{ emptyText }}
      </span>
    </div>

    <div
      v-if="totalCount > 0"
      class="flex flex-wrap items-center gap-1.5"
      :data-testid="`${dataTestid}-preview-row`"
    >
      <slot
        name="preview"
        :items="previewItems"
        :remaining-count="remainingCount"
        :total-count="totalCount"
      >
        <UBadge
          v-for="(item, idx) in previewItems"
          :key="idx"
          :data-testid="`${dataTestid}-pill-${idx}`"
          color="gray"
          variant="solid"
          size="xs"
          class="font-medium text-bcGovGray-900"
        >
          <slot
            name="item"
            :item="item"
            :index="idx"
          >
            {{ itemFormatter(item) }}
          </slot>
        </UBadge>

        <UButton
          v-if="remainingCount > 0"
          :data-testid="`${dataTestid}-more-button`"
          size="2xs"
          color="primary"
          variant="soft"
          class="font-semibold"
          @click="isModalOpen = true"
        >
          +{{ remainingCount }} more
        </UButton>

        <UButton
          v-if="allowCopy"
          :data-testid="`${dataTestid}-copy-button`"
          :icon="copied ? 'i-mdi-check' : 'i-mdi-content-copy'"
          :label="copied ? 'Copied' : 'Copy'"
          size="2xs"
          color="gray"
          variant="solid"
          @click="copyAll"
        />
      </slot>
    </div>

    <ModalBase
      v-if="remainingCount > 0"
      v-model="isModalOpen"
      :title="title || label.replace(/:$/, '') || `List of ${pluralLabel}`"
      :actions="[{ label: 'Close', handler: () => { isModalOpen = false } }]"
      width="w-full sm:max-w-2xl"
    >
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div class="flex items-center gap-2">
            <UBadge
              color="primary"
              variant="subtle"
              size="sm"
              class="font-semibold"
            >
              {{ totalCount }} {{ countSuffix }}
            </UBadge>
            <span
              v-if="searchQuery && filteredCount !== totalCount"
              class="text-xs text-gray-500"
            >
              ({{ filteredCount }} matching)
            </span>
          </div>

          <UButton
            v-if="allowCopy"
            :data-testid="`${dataTestid}-dialog-copy`"
            :icon="copied ? 'i-mdi-check' : 'i-mdi-content-copy'"
            :label="copied ? 'Copied!' : 'Copy All'"
            size="xs"
            color="gray"
            variant="ghost"
            @click="copyAll"
          />
        </div>

        <UInput
          v-if="allowSearch && totalCount > 4"
          v-model="searchQuery"
          :data-testid="`${dataTestid}-search-input`"
          icon="i-mdi-magnify"
          size="sm"
          :placeholder="`Filter ${pluralLabel}...`"
          :trailing="Boolean(searchQuery)"
          :ui="{ icon: { trailing: { pointer: '' } } }"
        >
          <template
            v-if="searchQuery"
            #trailing
          >
            <UButton
              color="gray"
              variant="link"
              size="2xs"
              icon="i-mdi-close"
              :padded="false"
              @click="searchQuery = ''"
            />
          </template>
        </UInput>

        <div class="max-h-[50vh] space-y-4 overflow-y-auto p-1">
          <div
            v-for="(group, gIdx) in filteredGroups"
            :key="gIdx"
            class="space-y-2"
          >
            <div
              v-if="group.label"
              class="border-b border-gray-100 pb-1 text-xs font-bold uppercase
                tracking-wider text-bcGovColor-darkGray"
            >
              {{ group.label }} ({{ group.items.length }})
            </div>

            <div class="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
              <UBadge
                v-for="(item, iIdx) in group.items"
                :key="iIdx"
                color="white"
                variant="solid"
                size="sm"
                class="justify-center py-1.5 font-medium text-bcGovGray-900"
              >
                <slot
                  name="item"
                  :item="item"
                  :index="iIdx"
                >
                  {{ itemFormatter(item) }}
                </slot>
              </UBadge>
            </div>
          </div>

          <div
            v-if="!filteredGroups.length"
            class="py-8 text-center text-sm text-gray-500"
          >
            No {{ pluralLabel }} found matching "{{ searchQuery }}"
          </div>
        </div>
      </div>
    </ModalBase>
  </div>
</template>
