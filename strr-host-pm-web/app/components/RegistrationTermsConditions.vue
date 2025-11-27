<script setup lang="ts">
import type { ConditionsOfApproval } from '#imports'

const { t } = useNuxtApp().$i18n
const permitStore = useHostPermitStore()
const { registration } = storeToRefs(permitStore)

const conditionsOfApproval = computed<ConditionsOfApproval>(() => registration.value?.conditionsOfApproval || {})

const predefinedConditions = computed(() => conditionsOfApproval.value.predefinedConditions)
const customConditions = computed(() => conditionsOfApproval.value.customConditions)
const minBookingDays = computed(() => registration.value?.conditionsOfApproval?.minBookingDays || 'n/a')
</script>

<template>
  <BaseTermsConditions
    :status-label="t('strr.label.registrationStatus')"
    :predefined-conditions="predefinedConditions"
    :custom-conditions="customConditions"
    :min-booking-days="minBookingDays"
    data-test-id="reg-terms-conditions"
  />
</template>
