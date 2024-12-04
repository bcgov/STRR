<script setup lang="ts">
import type { ConnectBasicChecklist } from '~/interfaces/connect-checklist'

defineProps<ConnectBasicChecklist>()

const listId = useId()

const checklistId = `connect-requirement-checklist-${listId}`
const checklistTitleId = `connect-requirement-checklist-title-${listId}`
const checklistItemId = `-connect-requirement-checklist-item-${listId}`
</script>
<template>
  <section
    :id="checklistId"
    :aria-labelledby="checklistTitleId"
  >
    <h3 :id="checklistTitleId" class="font-bold">
      {{ title }}
    </h3>
    <ul
      class="mt-5 list-outside list-disc space-y-3 pl-10"
      :aria-labelledby="checklistTitleId"
    >
      <li
        v-for="item, i in items"
        :id="i + checklistItemId"
        :key="i + checklistItemId"
      >
        <span>{{ item }}</span>
      </li>
    </ul>
  </section>
</template>
