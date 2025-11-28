<script setup lang="ts">
defineProps<{
  loading: boolean
  showPermitDetails: boolean
  owners: ConnectAccordionItem[]
}>()
</script>
<template>
  <div class="space-y-10 sm:w-[300px]">
    <slot name="terms-conditions">
      <RegistrationTermsConditions v-if="!loading" />
    </slot>
    <ConnectDashboardSection
      id="individuals-business-section"
      data-test-id="individuals-business-section"
      :title="$t('strr.label.individualsBusinesses')"
      :loading="loading"
    >
      <ConnectAccordion
        v-if="showPermitDetails"
        :items="owners"
        multiple
        data-test-id="owners-accordion"
      />
      <div v-else class="w-full bg-white p-5 opacity-50" data-test-id="complete-filing-message">
        <p class="text-sm">
          {{ $t('text.completeFilingToDisplay') }}
        </p>
      </div>
    </ConnectDashboardSection>
  </div>
</template>
