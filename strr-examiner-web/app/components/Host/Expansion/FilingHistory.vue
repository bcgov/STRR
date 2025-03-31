<script setup lang="ts">

defineEmits<{ close: [void] }>()

const { getApplicationFilingHistory } = useExaminerStore()
const { activeHeader } = storeToRefs(useExaminerStore())

// business requirement: don’t show auto approval logic events - it’s implied that it’s done by the system
const HIDDEN_EVENTS: FilingHistoryEventName[] = [
  FilingHistoryEventName.AUTO_APPROVAL_FULL_REVIEW,
  FilingHistoryEventName.AUTO_APPROVAL_PROVISIONAL,
  FilingHistoryEventName.AUTO_APPROVAL_APPROVED
]

const { data: filingHistory, status } = await useLazyAsyncData<FilingHistoryEvent[]>(
  'application-filing-history',
  async () => {
    if (!activeHeader.value?.applicationNumber) { return [] }
    const allFilingHistroy = await getApplicationFilingHistory(activeHeader.value.applicationNumber)
    return allFilingHistroy.filter(event => !HIDDEN_EVENTS.includes(event.eventName)).reverse()
  }
)

const historyTableColumns: { key: keyof FilingHistoryEvent }[] = [
  { key: 'createdDate' },
  { key: 'message' }
]

</script>

<template>
  <UCard
    :ui="{ body: { padding: 'sm:px-8' } }"
  >
    <div class="flex justify-between">
      <div class="w-[200px] font-bold">
        {{ $t('label.history') }}
      </div>
      <UIcon
        v-if="status === 'pending'"
        name="i-mdi-loading"
        class="size-6 shrink-0 animate-spin"
      />
      <div
        v-else
        class="flex-1"
      >
        <UTable
          :rows="filingHistory"
          :columns="historyTableColumns"
          :empty-state="{ icon: '', label: 'Error retrieving history. Please try again later.' }"
          :ui="{
            wrapper: 'relative overflow-x-auto h-auto',
            divide: 'divide-none',
            td: {
              base: 'max-w-none',
              padding: 'px-0 py-2'
            },
            th: {
              base: 'hidden'
            }
          }"
          data-testid="history-table"
        >
          <template #createdDate-data="{ row }">
            {{ dateToString(row.createdDate, 'MMM dd, yyyy') }}
            <span class="mx-5" />
            {{ dateToString(row.createdDate, 'a') }}
          </template>
          <template #message-data="{ row }">
            <b>{{ row.message }}</b>
          </template>
        </UTable>
      </div>
      <div
        class="flex w-[150px] justify-end align-top"
      >
        <UButton
          :label="$t('btn.close')"
          trailing-icon="i-mdi-close"
          variant="ghost"
          class="h-min"
          @click="$emit('close')"
        />
      </div>
    </div>
  </UCard>
</template>

<style>

</style>
