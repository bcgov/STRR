<script setup lang="ts">

defineEmits<{ close: [void] }>()

const { getApplicationFilingHistory, getRegistrationFilingHistory } = useExaminerStore()
const { isApplication, activeRecord } = storeToRefs(useExaminerStore())

// business requirement: don’t show auto approval logic events - it’s implied that it’s done by the system
const HIDDEN_EVENTS: FilingHistoryEventName[] = [
  FilingHistoryEventName.AUTO_APPROVAL_FULL_REVIEW,
  FilingHistoryEventName.AUTO_APPROVAL_PROVISIONAL,
  FilingHistoryEventName.AUTO_APPROVAL_APPROVED
]

const { data: filingHistory, status } = await useLazyAsyncData<FilingHistoryEvent[]>(
  'application-filing-history',
  async () => {
    let allFilingHistory: FilingHistoryEvent[] = []

    if (isApplication.value) {
      allFilingHistory =
        await getApplicationFilingHistory((activeRecord.value as HousApplicationResponse).header.applicationNumber)
    } else {
      // for Registrations include Application and Registration histories
      const [applicationHistory, registrationHistory] = await Promise.all([
        getApplicationFilingHistory(
          (activeRecord.value as HousRegistrationResponse).header.applications[0].applicationNumber
        ),
        getRegistrationFilingHistory((activeRecord.value as HousRegistrationResponse).id)
      ])
      allFilingHistory = [...applicationHistory, ...registrationHistory]
    }

    // filter out events defined by the requirements
    return allFilingHistory.filter(event => !HIDDEN_EVENTS.includes(event.eventName)).reverse()
  }
)

const historyTableColumns = [
  { key: 'createdDate', width: 200 },
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
              base: 'max-w-none first:w-[200px]',
              padding: 'px-0 py-2'
            },
            th: {
              base: 'hidden'
            }
          }"
          data-testid="history-table"
        >
          <template #createdDate-data="{ row }">
            {{ dateToString(row.createdDate, 'MMM dd, yyyy', true) }}
            <span class="mx-3" />
            {{ dateToString(row.createdDate, 'a', true) }}
          </template>
          <template #message-data="{ row }">
            <b>{{ $t(`filingHistoryEvents.${row.eventName}`) }}</b>
            <ConnectI18nHelper
              v-if="row.idir"
              translation-path="label.filingHistoryIdir"
              :idir="row.idir"
              data-testid="filing-history-idir"
            />
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
