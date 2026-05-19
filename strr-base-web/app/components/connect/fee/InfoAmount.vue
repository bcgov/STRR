<script setup lang="ts">
import { FeeInfo } from '~/enums/fee-info'

const { t } = useI18n()
const rtc = useRuntimeConfig().public
const { feeInfo, total } = storeToRefs(useConnectFeeStore())

const isExpanded = ref(false)

const FEE_INFO_MAP = {
  [FeeInfo.FEE_INFO_1]: {
    id: 'fee-info-1',
    heading: 'ConnectFeeInfo.scenarios.primaryResidence.heading',
    bullets: [
      'ConnectFeeInfo.scenarios.primaryResidence.bullet1',
      'ConnectFeeInfo.scenarios.primaryResidence.bullet2',
      'ConnectFeeInfo.scenarios.primaryResidence.bullet3'
    ]
  },
  [FeeInfo.FEE_INFO_2]: {
    id: 'fee-info-2',
    heading: 'ConnectFeeInfo.scenarios.separateUnit.heading',
    bullets: [
      'ConnectFeeInfo.scenarios.separateUnit.bullet1',
      'ConnectFeeInfo.scenarios.separateUnit.bullet2'
    ]
  },
  [FeeInfo.FEE_INFO_3]: {
    id: 'fee-info-3',
    heading: 'ConnectFeeInfo.scenarios.differentProperty.heading',
    bullets: [
      'ConnectFeeInfo.scenarios.differentProperty.bullet1'
    ]
  }
}

const feeScenario = computed(() => feeInfo.value ? FEE_INFO_MAP[feeInfo.value] : undefined)

const feeInfoConfig = useAppConfig().strrBaseLayer.feeInfo

const linkHref = computed(() => {
  const key = feeInfoConfig?.hrefRtcKey
  return key && key in rtc ? rtc[key] as string : undefined
})

</script>
<template>
  <div
    v-if="feeScenario && total"
    class="w-full rounded bg-white shadow-md"
  >
    <button
      class="flex w-full items-center justify-between px-4 py-3 text-left font-bold text-str-textGray"
      :aria-expanded="isExpanded"
      @click="isExpanded = !isExpanded"
    >
      <span>{{ t('ConnectFeeInfo.title') }}</span>
      <UIcon
        class="size-5 shrink-0"
        :name="isExpanded ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down'"
      />
    </button>
    <ConnectTransitionCollapse>
      <div v-if="isExpanded" :data-testid="feeScenario.id" class="px-4 pb-4">
        <p class="text-str-bodyGray">
          {{ t(feeScenario.heading) }}
        </p>
        <ul class="mt-2 list-disc px-5 text-sm text-str-mutedGray">
          <li
            v-for="bullet in feeScenario.bullets"
            :key="bullet"
            class="mb-2"
          >
            {{ t(bullet) }}
          </li>
        </ul>
        <UButton
          v-if="linkHref"
          :to="linkHref"
          variant="link"
          :padded="false"
          target="_blank"
          trailing-icon="i-mdi-open-in-new"
          class="mt-2 text-base"
        >
          {{ t('ConnectFeeInfo.allFeeTypes') }}
          <span class="sr-only">{{ t('ConnectFeeInfo.allFeeTypesAria') }}</span>
        </UButton>
      </div>
    </ConnectTransitionCollapse>
  </div>
</template>
