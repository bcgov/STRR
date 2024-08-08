<template>
  <div
    data-cy="fee-widget"
    role="complementary"
    class="
      desktop:w-[280px]
      mobile:w-[calc(100%-8px)] mobile:fixed mobile:bottom-[4px] mobile:mx-[4px] mobile:left-[0px]
      rounded-[4px] font-bold text-black bg-white z-10
      shadow-md
    "
  >
    <div
      :class="`
        ${isMobile && folded ? 'rounded-[4px]' : 'rounded-t-[4px]'}
        px-[15px] py-[10px] pt-[10px] text-white bg-blue-550 rounded-t-[4px] flex flex-row justify-between
        mobile:cursor-pointer
        `
      "
      @click="toggleFolded"
    >
      <p>{{ t("feeWidget.summary") }}</p>
      <div class="hidden mobile:flex">
        <img
          src="/icons/caret.svg"
          alt="Toggle fee widget shown"
          :class="`cursor-pointer transition-all ${folded ? 'rotate-180': ''}`"
        >
      </div>
    </div>
    <div :class="`transition-all ${folded ? 'h-[0px] overflow-hidden p-[0px]': 'px-[15px] pb-[10px] '}`">
      <div class="py-[10px] border-b-[1px] border-bcGovGray-300 flex flex-row justify-between">
        <p>{{ t("feeWidget.registrationFee") }}</p>
        <p>{{ fee?.filingFees ? `$${fee.filingFees.toFixed(2)}`: '-' }}</p>
      </div>
      <div class="py-[10px] border-b-[1px] border-bcGovGray-300 flex flex-row justify-between">
        <p>{{ t("feeWidget.serviceFee") }}</p>
        <p>{{ fee?.serviceFees ? `$${fee.serviceFees.toFixed(2)}`: '-' }}</p>
      </div>
      <div class="py-[10px] text-[14px] font-bold flex-row flex justify-between items-end" aria-label="null">
        <p>{{ t("feeWidget.total") }}</p>
        <p class="font-normal text-[14px] text-bcGovGray-700 flex items-end">
          {{ t("feeWidget.cad") }}
          <b class="text-black text-[24px] ml-[5px] mb-[-4px] flex items-end">
            {{ fee?.total ? `$${fee.total.toFixed(2)}` : '-' }}
          </b>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import useScreenSize from '../../../composables/useScreenSize'

const t = useNuxtApp().$i18n.t
const folded = ref(false)
const isMobile = ref(false)

const { fee } = defineProps<{
  fee: FeeI
}>()

const toggleFolded = () => {
  if (isMobile) {
    folded.value = !folded.value
  }
}

const { width } = useScreenSize()

if (isMobile.value) {
  folded.value = true
}

watch(width, () => {
  isMobile.value = width.value <= 1263
  if (!isMobile.value && folded) {
    folded.value = false
  }
})

</script>
