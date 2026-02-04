<script lang="ts" setup>
const { t } = useNuxtApp().$i18n
const exStore = useExaminerStore()
const { snapshotInfo } = storeToRefs(exStore)
</script>

<template>
  <div
    class="flex flex-col gap-y-2 rounded-xl border-[3px] border-[#E2E8EE]
     bg-white px-4 py-3 text-sm md:absolute md:right-0 md:top-0"
    data-testid="snapshot-info"
  >
    <span>
      <b>{{ t('strr.label.version') }}</b> {{ snapshotInfo.version }}
    </span>
    <span>
      <b>{{ t('strr.label.date') }}</b> {{ dateToString(snapshotInfo.snapshotDateTime, 'y-MM-dd a', true) }}
    </span>
  </div>
</template>
