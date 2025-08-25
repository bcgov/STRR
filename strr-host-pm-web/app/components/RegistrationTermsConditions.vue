<script setup lang="ts">
const { t } = useNuxtApp().$i18n
const { details } = storeToRefs(useConnectDetailsHeaderStore())
const permitStore = useHostPermitStore()
const { registration } = storeToRefs(permitStore)

const conditionsOfApproval = computed(() => registration.value?.conditionsOfApproval)
const { predefinedConditions, customConditions } = conditionsOfApproval.value || {}

const statusBadge = computed(() => details.value.at(0))

const minBookingDays = computed(() => registration.value?.conditionsOfApproval?.minBookingDays || 'n/a')

</script>

<template>
  <div
    class="space-y-3 text-[#212529]"
    data-test-id="reg-terms-conditions"
  >
    <div class="flex items-center gap-x-2">
      <ConnectTypographyH2
        custom-class="text-lg font-bold leading-none whitespace-nowrap"
        :text="$t('strr.label.registrationStatus')"
      />
      <UBadge
        v-if="statusBadge && statusBadge.chip"
        :label="statusBadge.text"
        :color="statusBadge.chipColour || 'primary'"
        class="whitespace-nowrap py-1 font-bold uppercase"
        data-test-id="reg-status-badge"
      />
    </div>
    <div class="rounded border border-[#1669BB] bg-[#E4EDF7] p-5">
      <span class="flex items-center gap-2 text-base font-bold">
        <UIcon
          name="i-mdi-info-outline"
          class=" size-6 text-[#38598A]"
        />{{ $t('strr.label.termsConditions') }}
      </span>

      <div class="ml-4 mt-4 text-sm">
        <ul
          v-if="predefinedConditions"
          class="list-outside list-disc"
          data-test-id="terms-conditions-predefined"
        >
          <li
            v-for="(condition, index) in predefinedConditions"
            :key="index"
            class="mb-2"
          >
            {{ t(`approvalConditionsExpanded.${condition}`, { minDays: minBookingDays }) }}
          </li>
        </ul>
        <ul
          v-if="customConditions"
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

<style scoped>
</style>
