<script setup lang="ts">

import { useFilingHistory } from '~/composables/useFilingHistory'

defineEmits<{ close: [void] }>()

const { t } = useI18n()

const {
  filingHistory,
  status,
  historyTableColumns,
  shouldRenderFilingHistoryAccordion,
  getFilingHistoryAccordionContent,
  isEmptyFilingHistoryAccordion
} = await useFilingHistory()

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
              {{ dateToString(row.createdDate, 'MMM dd, yyyy', true) }}
              <span class="mx-3" />
              {{ dateToString(row.createdDate, 'a', true) }}
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
