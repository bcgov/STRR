<script setup lang="ts">

const {
  feeOptions,
  fees,
  placeholderFeeItem,
  total,
  totalServiceFees,
  totalFutureEffectiveFees,
  totalPriorityFees,
  totalProcessingFees,
  totalGst,
  totalPst
} = storeToRefs(useConnectFeeStore())

const isPlaceholderActive = ref(false)

const feeItems = computed<ConnectFeeItem[]>(() => {
  if (fees.value && (Object.keys(fees.value).length > 0)) {
    // @ts-ignore
    isPlaceholderActive.value = false
    return Object.values(fees.value)
  }
  isPlaceholderActive.value = true
  return [placeholderFeeItem.value]
})

// folding stuff
const folded = ref(false)

const isFoldable = useMediaQuery('(max-width: 1024px)')
watch(isFoldable, (val) => {
  if (!val) {
    folded.value = false
  }
})

const toggleFolded = () => {
  if (isFoldable.value) {
    folded.value = !folded.value
  }
}

</script>
<template>
  <div
    data-testid="fee-widget"
    class="z-10 mr-5 w-full rounded bg-white shadow-md lg:mr-0 lg:w-[320px]"
  >
    <UButton
      :tabindex="isFoldable ? 0 : -1"
      :role="isFoldable ? 'button' : 'title'"
      class="flex w-full bg-midnightBlue-900 py-2 pl-4 text-lg font-bold transition-all"
      :class="[folded ? 'rounded' : 'rounded-b-none rounded-t', isFoldable ? '' : 'pointer-events-none']"
      :aria-label="$t('feeSummary.title')"
      :label="$t('feeSummary.title')"
      @click="toggleFolded"
    >
      <template #trailing>
        <div class="flex grow justify-end pr-1">
          <UIcon
            v-if="isFoldable"
            class="size-7"
            :name="folded ? 'i-mdi-chevron-down' : 'i-mdi-chevron-up'"
          />
        </div>
      </template>
    </UButton>
    <div
      class="text-sm transition-all"
      :class="folded ? 'h-[0px] overflow-hidden': 'px-4 pt-1'"
    >
      <div
        v-for="feeItem in feeItems"
        :key="feeItem.filingTypeCode"
        class="flex flex-row justify-between border-b border-bcGovGray-300 py-3"
      >
        <p class="font-bold">
          {{ $t(`feeSummary.itemLabels.${feeItem.filingTypeCode}`) }}
        </p>
        <p>
          {{
            feeItem.waived
              ? $t('feeSummary.noFee')
              : !feeItem.isPlaceholder ? `$${feeItem.filingFees.toFixed(2)}` : '$ -' }}
        </p>
      </div>
      <ConnectFeeExtraFee
        v-if="feeOptions.showFutureEffectiveFees"
        :description="$t('feeSummary.futureEffectiveFees')"
        :fee="totalFutureEffectiveFees"
        :show-fee-value="isPlaceholderActive"
      />
      <ConnectFeeExtraFee
        v-if="feeOptions.showPriorityFees"
        :description="$t('feeSummary.priorityFees')"
        :fee="totalPriorityFees"
        :show-fee-value="isPlaceholderActive"
      />
      <ConnectFeeExtraFee
        v-if="feeOptions.showProcessingFees"
        :description="$t('feeSummary.processingFees')"
        :fee="totalProcessingFees"
        :show-fee-value="isPlaceholderActive"
      />
      <ConnectFeeExtraFee
        v-if="feeOptions.showServiceFees"
        :description="$t('feeSummary.serviceFees')"
        :fee="isPlaceholderActive ? placeholderFeeItem.serviceFees : totalServiceFees"
        show-fee-value
      />
      <ConnectFeeExtraFee
        v-if="feeOptions.showPst"
        :description="$t('feeSummary.pst')"
        :fee="totalPst"
        :show-fee-value="isPlaceholderActive"
      />
      <ConnectFeeExtraFee
        v-if="feeOptions.showGst"
        :description="$t('feeSummary.gst')"
        :fee="totalGst"
        :show-fee-value="isPlaceholderActive"
      />
      <div class="flex flex-row items-end justify-between py-3">
        <p class="mb-1 font-bold">
          {{ $t("feeSummary.total") }}
        </p>
        <p class="flex items-end text-sm text-bcGovGray-700">
          <span class="mb-1">{{ $t("currency.cad") }}</span>
          <b class="ml-[5px] flex items-end text-2xl text-black">
            {{ !isPlaceholderActive ? `$${total.toFixed(2)}` : '$ -' }}
          </b>
        </p>
      </div>
    </div>
  </div>
</template>
