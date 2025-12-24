<script setup lang="ts">
const { t } = useNuxtApp().$i18n
const { details } = storeToRefs(useConnectDetailsHeaderStore())

defineProps<{
  statusLabel: string
  predefinedConditions?: string[]
  customConditions?: string[]
  minBookingDays?: string | number
  dataTestId?: string
}>()

const statusBadges = computed(() => details.value.filter(d => d.chip))
</script>

<template>
  <div
    class="space-y-3 text-gray-950"
    :data-test-id="dataTestId || 'status-terms-conditions'"
  >
    <div :class="statusBadges.length > 1 ? 'flex flex-col gap-y-2' : 'flex items-center gap-x-2'">
      <ConnectTypographyH2
        custom-class="text-lg font-bold leading-none whitespace-nowrap"
        :text="statusLabel"
      />
      <div class="flex flex-wrap gap-2">
        <UBadge
          v-for="(badge, index) in statusBadges"
          :key="index"
          :label="badge.text"
          :color="badge.chipColour || 'primary'"
          class="whitespace-nowrap py-1 font-bold uppercase"
          :data-test-id="index === 0 ? `${dataTestId}-badge` : `${dataTestId}-badge-${index}`"
        />
      </div>
    </div>
    <div class="rounded border border-[#1669BB] bg-[#E4EDF7] p-5">
      <span class="flex items-center gap-2 text-base font-bold">
        <UIcon
          name="i-mdi-info-outline"
          class="size-6 text-[#38598A]"
        />{{ $t('strr.label.termsConditions') }}
      </span>

      <div class="ml-4 mt-4 text-sm">
        <ul
          v-if="predefinedConditions && predefinedConditions.length"
          class="list-outside list-disc"
          data-test-id="terms-conditions-predefined"
        >
          <li
            v-for="(condition, index) in predefinedConditions"
            :key="index"
            class="mb-2"
          >
            {{ t(`approvalConditionsExpanded.${condition}`, { minDays: minBookingDays || 'n/a' }) }}
          </li>
        </ul>
        <ul
          v-if="customConditions && customConditions.length"
          data-test-id="terms-conditions-custom"
          class="list-outside list-disc"
        >
          <li
            v-for="(condition, index) in customConditions"
            :key="index"
            class="mb-2"
          >
            {{ condition }}
          </li>
        </ul>
        <ul
          class="list-outside list-disc"
          data-test-id="terms-always-shown"
        >
          <li>
            {{ t('text.complyWithBylaws') }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
