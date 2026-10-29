<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type {
  ConnectTreeTableColumn,
  ConnectTreeTableRow,
  ConnectTreeTableRowMeta
} from '~/interfaces/connect-tree-table'

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<{
    columns: ConnectTreeTableColumn[]
    rows: ConnectTreeTableRow[]
    loading?: boolean
    emptyState?: { icon?: string; label?: string }
    tableUI?: Record<string, any>
    rowIdFn?:(row: any) => string | number
    childrenFn?: (row: any) => any[] | undefined
    rowClassFn?: (row: any, meta: ConnectTreeTableRowMeta) => string
    expandedIds?: Set<string | number>
    defaultExpandAll?: boolean
    treeColumnKey?: string
  }>(),
  {
    loading: false,
    emptyState: () => ({ icon: 'i-mdi-folder-open-outline', label: 'No records found' }),
    tableUI: () => ({
      wrapper: 'relative overflow-x-auto min-h-[380px]',
      thead: 'sticky top-0 bg-white z-10 border-b border-gray-200',
      th: { padding: 'p-3', font: 'font-bold', color: 'text-gray-900', size: 'text-sm' },
      td: {
        base: 'whitespace-normal align-middle',
        padding: 'p-3.5',
        color: 'text-bcGovColor-midGray',
        size: 'text-sm'
      }
    }),
    rowIdFn: (row: any) => (row?.id !== undefined ? row.id : (row?.number || '')),
    childrenFn: (row: any) => (Array.isArray(row?.children) ? row.children : undefined),
    rowClassFn: undefined,
    expandedIds: undefined,
    defaultExpandAll: false,
    treeColumnKey: undefined
  }
)

const emit = defineEmits<{
  'update:expandedIds': [expandedIds: Set<string | number>]
  'toggle': [rowId: string | number, isExpanded: boolean, row: any]
  'select': [row: any]
}>()

const collectParentIds = (items: ConnectTreeTableRow[]): Set<string | number> => {
  const ids = new Set<string | number>()
  const collect = (list: ConnectTreeTableRow[]) => {
    list.forEach((item) => {
      const children = props.childrenFn(item)
      if (children && children.length > 0) {
        ids.add(props.rowIdFn(item))
        collect(children)
      }
    })
  }
  collect(items || [])
  return ids
}

// Internal expansion set when not controlled externally via v-model:expandedIds
const internalExpandedIds = ref<Set<string | number>>(
  props.defaultExpandAll && props.rows
    ? collectParentIds(props.rows)
    : new Set()
)

// Computed set of active expanded IDs
const activeExpandedIds = computed<Set<string | number>>({
  get: () => props.expandedIds ?? internalExpandedIds.value,
  set: (val: Set<string | number>) => {
    if (props.expandedIds !== undefined) {
      emit('update:expandedIds', val)
    } else {
      internalExpandedIds.value = val
    }
  }
})

// Update if defaultExpandAll is set and rows change
watch(() => props.rows, (newRows) => {
  if (props.defaultExpandAll && newRows && props.expandedIds === undefined) {
    internalExpandedIds.value = collectParentIds(newRows)
  }
})

const effectiveTreeColumnKey = computed(() => {
  if (props.treeColumnKey) {
    return props.treeColumnKey
  }
  return props.columns?.[0]?.key ?? 'property'
})

// Default row styling helper if user hasn't supplied custom rowClassFn
const defaultRowClass = (row: any, meta: ConnectTreeTableRowMeta): string => {
  if (props.rowClassFn) {
    return props.rowClassFn(row, meta)
  }
  if (meta.isParent) {
    return meta.isExpanded
      ? 'bg-blue-50/30 font-medium'
      : 'bg-white hover:bg-gray-50/80'
  }
  if (meta.isChild) {
    const border = meta.isLastChild ? 'border-b-2 border-gray-200' : ''
    return `bg-slate-50/90 hover:bg-slate-100 transition-colors ${border}`.trim()
  }
  return 'bg-white hover:bg-gray-50/80'
}

// Flatten tree hierarchy into visible rows
const visibleRows = computed(() => {
  const result: any[] = []

  const walk = (
    items: ConnectTreeTableRow[],
    level: number,
    parentId?: string | number
  ) => {
    const totalItems = items.length

    items.forEach((item, index) => {
      const id = props.rowIdFn(item)
      const children = props.childrenFn(item)
      const hasChildren = !!(children && children.length > 0)
      const isExpanded = activeExpandedIds.value.has(id)
      const isLastChild = index === totalItems - 1

      const meta: ConnectTreeTableRowMeta = {
        isParent: hasChildren || (level === 0 && item.rowType === 'registration'),
        isChild: level > 0,
        isExpanded,
        hasChildren,
        isLastChild,
        level,
        parentId
      }

      const rowClass = defaultRowClass(item, meta)

      // Attach flattened metadata to the row
      const flattenedRow = {
        ...item,
        _treeMeta: meta,
        isParent: meta.isParent,
        isChild: meta.isChild,
        isExpanded: meta.isExpanded,
        hasChildren: meta.hasChildren,
        isLastChild: meta.isLastChild,
        level: meta.level,
        class: `${item.class || ''} ${rowClass}`.trim()
      }

      result.push(flattenedRow)

      // If expanded and has children, recursively add them
      if (isExpanded && hasChildren && children) {
        walk(children, level + 1, id)
      }
    })
  }

  walk(props.rows || [], 0, undefined)
  return result
})

// Expand / Collapse Handlers
const isExpanded = (id: string | number): boolean => {
  return activeExpandedIds.value.has(id)
}

const toggleExpand = (id: string | number) => {
  const next = new Set(activeExpandedIds.value)
  let nowExpanded = false
  if (next.has(id)) {
    next.delete(id)
    nowExpanded = false
  } else {
    next.add(id)
    nowExpanded = true
  }
  activeExpandedIds.value = next

  const matchingRow = props.rows.find(r => props.rowIdFn(r) === id)
  emit('toggle', id, nowExpanded, matchingRow)
}

// Find all parent nodes that have children
const allParentIds = computed<Set<string | number>>(() => {
  const ids = new Set<string | number>()
  const collect = (items: ConnectTreeTableRow[]) => {
    items.forEach((item) => {
      const children = props.childrenFn(item)
      if (children && children.length > 0) {
        ids.add(props.rowIdFn(item))
        collect(children)
      }
    })
  }
  collect(props.rows || [])
  return ids
})

const areAllExpanded = computed(() => {
  if (allParentIds.value.size === 0) {
    return false
  }
  for (const id of allParentIds.value) {
    if (!activeExpandedIds.value.has(id)) {
      return false
    }
  }
  return true
})

const expandAll = () => {
  const next = new Set(activeExpandedIds.value)
  for (const id of allParentIds.value) {
    next.add(id)
  }
  activeExpandedIds.value = next
}

const collapseAll = () => {
  activeExpandedIds.value = new Set()
}

const toggleExpandAll = () => {
  if (areAllExpanded.value) {
    collapseAll()
  } else {
    expandAll()
  }
}

// Expose public API for consumers (buttons, toolbars, parent components)
defineExpose({
  activeExpandedIds,
  isExpanded,
  toggleExpand,
  expandAll,
  collapseAll,
  toggleExpandAll,
  areAllExpanded
})
</script>

<template>
  <UTable
    :columns="columns"
    :rows="visibleRows"
    :loading="loading"
    :empty-state="emptyState"
    :ui="tableUI"
    v-bind="$attrs"
    @select="emit('select', $event)"
  >
    <!-- Forward empty state slot -->
    <template v-if="$slots['empty-state']" #empty-state="slotProps">
      <slot name="empty-state" v-bind="slotProps" />
    </template>

    <!-- Forward loading state slot -->
    <template v-if="$slots['loading-state']" #loading-state="slotProps">
      <slot name="loading-state" v-bind="slotProps" />
    </template>

    <!-- Forward dynamic column data slots -->
    <template
      v-for="col in columns"
      :key="col.key"
      #[`${col.key}-data`]="slotProps"
    >
      <slot
        :name="`${col.key}-data`"
        v-bind="{
          ...slotProps,
          meta: slotProps.row._treeMeta,
          isParent: slotProps.row._treeMeta?.isParent,
          isChild: slotProps.row._treeMeta?.isChild,
          isExpanded: slotProps.row._treeMeta?.isExpanded,
          level: slotProps.row._treeMeta?.level,
          hasChildren: slotProps.row._treeMeta?.hasChildren,
          isLastChild: slotProps.row._treeMeta?.isLastChild,
          toggleExpand: () => toggleExpand(rowIdFn(slotProps.row))
        }"
      >
        <!-- Default Tree Column Renderer with branch lines & toggle chevron -->
        <div
          v-if="col.key === effectiveTreeColumnKey"
          class="flex items-start"
          :style="{ paddingLeft: `${(slotProps.row._treeMeta?.level ?? 0) * 1.5}rem` }"
        >
          <!-- Branch connector guide line -->
          <div
            v-if="slotProps.row._treeMeta?.isChild"
            class="relative mr-2 flex h-5 w-4 shrink-0 items-center"
          >
            <div
              class="absolute left-1 w-0.5 bg-gray-300"
              :class="slotProps.row._treeMeta?.isLastChild ? 'top-0 h-2.5' : 'top-0 h-full'"
            />
            <div class="absolute left-1 top-2.5 h-0.5 w-3 bg-gray-300" />
          </div>

          <!-- Toggle Chevron Button -->
          <button
            v-if="slotProps.row._treeMeta?.hasChildren"
            type="button"
            class="focus:outline-hidden mr-1.5 mt-0.5 rounded-md p-1 text-gray-600 transition-all
              hover:bg-gray-200/80 hover:text-gray-900 focus:ring-2 focus:ring-blue-500"
            :aria-label="slotProps.row._treeMeta?.isExpanded ? 'Collapse' : 'Expand'"
            data-testid="toggle-expand-btn"
            @click.stop="toggleExpand(rowIdFn(slotProps.row))"
          >
            <UIcon
              :name="slotProps.row._treeMeta?.isExpanded ? 'i-mdi-chevron-down' : 'i-mdi-chevron-right'"
              class="size-5 transition-transform"
            />
          </button>
          <div
            v-else-if="slotProps.row._treeMeta?.level === 0"
            class="mr-1.5 size-7 shrink-0"
          />

          <!-- Fallback Text -->
          <span class="truncate">{{ slotProps.row[col.key] }}</span>
        </div>

        <!-- Default Other Columns -->
        <span v-else>{{ slotProps.row[col.key] }}</span>
      </slot>
    </template>

    <!-- Forward header slots if provided -->
    <template
      v-for="col in columns"
      :key="`${col.key}-header`"
      #[`${col.key}-header`]="slotProps"
    >
      <slot :name="`${col.key}-header`" v-bind="slotProps" />
    </template>
  </UTable>
</template>
