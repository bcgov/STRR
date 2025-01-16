<script setup lang="ts">
import type { ConnectValidatedChecklist } from '~/interfaces/connect-checklist'

defineProps<ConnectValidatedChecklist>()

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
      :aria-labelledby="checklistTitleId"
      class="mt-5 list-outside list-disc space-y-3 pl-10"
    >
      <li
        v-for="item, i in items"
        :id="i + checklistItemId"
        :key="i + checklistItemId"
        :class="item.isValid || (!item.isValid && isComplete)
          ? 'flex items-center gap-1 list-none -ml-6'
          : ''"
        :aria-label="
          item.isValid
            ? $t('word.Valid') + ': ' + item.label
            : (!item.isValid && isComplete)
              ? $t('word.Invalid') + ': ' + item.label
              : item.label
        "
      >
        <UIcon
          v-if="item.isValid"
          :name="item.validIcon || 'i-mdi-check'"
          :class="item.validIconClass || 'size-5 text-green-600 shrink-0 self-start'"
        />
        <UIcon
          v-else-if="!item.isValid && isComplete"
          :name="item.invalidIcon || 'i-mdi-close'"
          :class="item.invalidIconClass || 'mt-[2px] size-5 text-red-600 shrink-0 self-start'"
        />
        <span aria-hidden="true">{{ item.label }}</span>
      </li>
    </ul>
  </section>
</template>
