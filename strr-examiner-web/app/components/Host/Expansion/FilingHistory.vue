<script setup lang="ts">

import { useFilingHistory } from '~/composables/useFilingHistory'

defineEmits<{ close: [void] }>()

const { t } = useI18n()

const {
  filingHistory,
  status,
  historyTableColumns,
  isEmailFilingHistoryEvent,
  getEmailFilingHistoryDetails,
  getEmailFilingHistoryTypeLabel,
  shouldRenderFilingHistoryAccordion,
  getFilingHistoryAccordionContent,
  isEmptyFilingHistoryAccordion
} = await useFilingHistory()

const formatSentDateTime = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

const formatHistoryDate = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  }).format(date)
}

const formatHistoryTime = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

const recipientStatusClass = (status: string): string => {
  if (status === 'DELIVERED') {
    return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200'
  }

  if (status === 'FAILED') {
    return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200'
  }

  if (status === 'IN_TRANSIT' || status === 'PENDING') {
    return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'
  }

  return 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-300'
}
</script>

<template>
  <UCard
    :ui="{ body: { padding: 'sm:px-8' } }"
  >
    <div class="flex justify-between">
      <div class="w-[200px] font-bold">
        {{ t('label.history') }}
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
              padding: 'px-0 py-0'
            },
            th: {
              base: 'hidden'
            }
          }"
          data-testid="history-table"
        >
          <template #createdDate-data="{ row }">
            <div class="py-3">
              {{ formatHistoryDate(row.createdDate) }}
              <span class="mx-3" />
              {{ formatHistoryTime(row.createdDate) }}
            </div>
          </template>
          <template #message-data="{ row }">
            <UAccordion
              v-if="shouldRenderFilingHistoryAccordion(row)"
              :items="[{ content: getFilingHistoryAccordionContent(row, t) }]"
              class="whitespace-pre-line"
              :class="isEmptyFilingHistoryAccordion(row, t) && 'italic'"
              :ui="{
                item: {
                  base: 'bg-str-bgGray leading-7 my-3 ml-2 rounded-[4px]',
                  padding: 'p-5'
                }
              }"
            >
              <template #default="{ open }">
                <UButton
                  variant="ghost"
                  class="mt-1 w-fit px-2"
                >
                  <template #leading>
                    <div class="flex items-center gap-1 text-gray-700">
                      <span class="font-semibold">{{ t(`filingHistoryEvents.${row.eventName}`) }}</span>
                      <span
                        v-if="isEmailFilingHistoryEvent(row)"
                        class="ml-2 text-sm font-normal text-gray-600"
                      >
                        ({{ getEmailFilingHistoryTypeLabel(row) }})
                      </span>
                      <ConnectI18nHelper
                        v-if="row.idir"
                        translation-path="label.filingHistoryIdir"
                        :idir="row.idir"
                        data-testid="filing-history-idir"
                      />
                      <UIcon
                        name="i-mdi-chevron-down"
                        class="size-6 text-blue-500 transition-transform duration-200"
                        :class="[open && 'rotate-180']"
                      />
                    </div>
                  </template>
                </UButton>
              </template>
              <template #item="{ item }">
                <div
                  v-if="isEmailFilingHistoryEvent(row)"
                  class="space-y-3 rounded-md bg-str-bgGray p-4"
                >
                  <div class="flex items-center gap-2 text-sm leading-5 text-gray-700">
                    <UIcon
                      name="i-mdi-email-outline"
                      class="size-4 shrink-0 text-blue-600"
                    />
                    <span class="font-semibold leading-5">Email type:</span>
                    <span class="leading-5">{{ getEmailFilingHistoryDetails(row).emailTypeLabel }}</span>
                  </div>

                  <div
                    v-if="getEmailFilingHistoryDetails(row).recipients.length"
                    class="space-y-2"
                  >
                    <div
                      v-for="recipient in getEmailFilingHistoryDetails(row).recipients"
                      :key="[
                        recipient.email,
                        recipient.status,
                        recipient.sentDate || recipient.failureReason || 'none'
                      ].join('-')"
                      class="rounded-md bg-white/70 px-3 py-2"
                    >
                      <div class="flex flex-wrap items-center justify-between gap-2 text-sm leading-5">
                        <div class="flex min-h-5 items-center gap-2 text-gray-800">
                          <UIcon
                            name="i-mdi-account-circle-outline"
                            class="size-4 shrink-0 text-gray-600"
                          />
                          <span class="font-medium leading-5">{{ recipient.email }}</span>
                        </div>
                        <span
                          :class="[
                            'inline-flex min-h-6 items-center rounded-full px-2 py-0.5 text-xs',
                            'font-semibold leading-5',
                            recipientStatusClass(recipient.status)
                          ]"
                        >
                          {{ recipient.statusLabel }}
                        </span>
                      </div>

                      <div
                        v-if="recipient.sentDate || recipient.failureReason"
                        class="mt-2 space-y-1 text-sm leading-5 text-gray-700"
                      >
                        <div
                          v-if="recipient.sentDate"
                          class="flex min-h-5 items-center gap-1"
                        >
                          <UIcon
                            name="i-mdi-clock-outline"
                            class="size-4 shrink-0 text-gray-500"
                          />
                          <span class="leading-5">
                            Sent: {{ formatSentDateTime(recipient.sentDate) }}
                          </span>
                        </div>
                        <div
                          v-if="recipient.failureReason"
                          class="flex min-h-5 items-center gap-1 text-red-700"
                        >
                          <UIcon
                            name="i-mdi-alert-circle-outline"
                            class="size-4 shrink-0"
                          />
                          <span class="leading-5">Failure reason: {{ recipient.failureReason }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  v-else
                  class="whitespace-pre-line"
                >
                  {{ item.content }}
                </div>
              </template>
            </UAccordion>
            <span
              v-else
              class="block px-2 py-3"
            >
              <b>{{ t(`filingHistoryEvents.${row.eventName}`) }}</b>
              <ConnectI18nHelper
                v-if="row.idir"
                translation-path="label.filingHistoryIdir"
                :idir="row.idir"
                data-testid="filing-history-idir"
              />
            </span>
          </template>
        </UTable>
      </div>
      <div
        class="flex w-[150px] justify-end align-top"
      >
        <UButton
          :label="t('btn.close')"
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
