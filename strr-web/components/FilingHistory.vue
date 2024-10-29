<script setup lang="ts">
import { formatLongDate, formatTimeString } from '~/utils/format-helper'

const props = defineProps<{
  header: string,
  history: FilingHistoryEventI[]
}>()

const { header, history } = props

const hasHistory: boolean = history.length > 0

</script>

<template>
  <div data-test-id="filing-history">
    <h2 class="font-bold mb-6 mobile:mx-2 text-xl">
      {{ header }}
    </h2>
    <div class="bg-white py-[22px] px-[30px] mobile:px-2">
      <div v-if="hasHistory" class="flex flex-col w-full justify-between">
        <div
          v-for="(event, index) in history.reverse()"
          :key="event.createdDate"
          class="flex"
          :class="{ 'mb-6': index < history.length - 1 }"
        >
          <div>
            <p class="text-bcGovColor-midGray mr-4">
              {{ formatLongDate(new Date(event.createdDate)) }}
            </p>
          </div>
          <div>
            <p class="text-bcGovColor-midGray">
              {{ formatTimeString(new Date(`${event.createdDate}Z`)) }}
            </p>
            <p class="font-bold">
              {{ event.message }}
            </p>
          </div>
        </div>
      </div>
      <div v-else>
        N/A
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
