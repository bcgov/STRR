<script setup lang="ts">
defineProps<{ isComplete: boolean }>()
</script>

<template>
  <div
    data-testid="step-define-your-rental"
    class="flex flex-col gap-10"
  >
    <FormDefineYourRentalUnitAddress :is-complete="isComplete" />

    <FormDefineYourRentalUnitDetails :is-complete="isComplete" />
  </div>
</template>
