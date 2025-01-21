<script setup lang="ts">
defineProps<{
  col1Labels: string[],
  col2Labels: string[],
  col3Labels: string[],
  col4Labels: string[]
}>()

const getColLabels = (labels: string[]) => {
  if (!labels.length) {
    // if nothing to show we still want the empty column for layout consistency
    return ['']
  }
  return labels
}
</script>
<template>
  <div class="app-inner-container">
    <div
      :class="[
        'grid grid-cols-4 gap-x-5 divide-x py-4 text-sm text-bcGovColor-midGray',
        '*:*:space-y-1 *:space-y-4 *:px-3 first:*:pl-0'
      ]"
    >
      <div>
        <div v-for="label, i in getColLabels(col1Labels)" :key="label">
          <strong class="text-gray-900">{{ label.toUpperCase() }}</strong>
          <slot :name="`col1-${i}`" />
        </div>
      </div>
      <div>
        <div v-for="label, i in getColLabels(col2Labels)" :key="label">
          <strong class="text-gray-900">{{ label.toUpperCase() }}</strong>
          <slot :name="`col2-${i}`" />
        </div>
      </div>
      <div>
        <div v-for="label, i in getColLabels(col3Labels)" :key="label">
          <strong class="text-gray-900">{{ label.toUpperCase() }}</strong>
          <slot :name="`col3-${i}`" />
        </div>
      </div>
      <div>
        <div v-for="label, i in getColLabels(col4Labels)" :key="label">
          <strong class="text-gray-900">{{ label.toUpperCase() }}</strong>
          <slot :name="`col4-${i}`" />
        </div>
      </div>
    </div>
  </div>
</template>
