<script setup lang="ts">
defineProps<{ isComplete: boolean }>()
const { isNewRentalUnitSetupEnabled } = useHostFeatureFlags()

</script>

<template>
  <div
    data-testid="step-define-your-rental"
    class="flex flex-col gap-10"
  >
    <FormDefineYourRentalUnitAddress :is-complete="isComplete" />

    <FormDefineYourRentalUnitDetails2
      v-if="isNewRentalUnitSetupEnabled"
      :is-complete="isComplete"
    />

    <FormDefineYourRentalUnitDetails
      v-else
      :is-complete="isComplete"
    />
  </div>
</template>
