<script setup lang="ts">
defineProps<{ isComplete: boolean }>()
const reqStore = usePropertyReqStore()
</script>
<template>
  <div class="flex flex-col gap-4" data-testid="property-requirements-section">
    <FormDefineYourRentalUnitRequirementsError
      v-if="reqStore.propertyReqError.type !== undefined"
      class="mt-10"
    />

    <FormDefineYourRentalUnitRequirementsStraaExempt
      v-else-if="reqStore.propertyReqs.isStraaExempt === true"
      class="mt-10"
    />

    <FormDefineYourRentalUnitRequirementsStrProhibited
      v-else-if="reqStore.propertyReqs.isStrProhibited === true"
      class="mt-10"
    />

    <FormDefineYourRentalUnitRequirementsPrExempt
      v-else-if="reqStore.propertyReqs.isPrincipalResidenceRequired === false && reqStore.requirementsList.length === 0"
      class="mt-10"
    />

    <FormDefineYourRentalUnitRequirementsList
      v-if="reqStore.requirementsList.length > 0 && reqStore.showUnitDetailsForm === true"
    />

    <FormDefineYourRentalUnitRequirementsPrRequired
      v-if="
        (reqStore.propertyReqs.isPrincipalResidenceRequired === true && reqStore.showUnitDetailsForm === true)
          || reqStore.overrideApplicationWarning
      "
      :is-complete="isComplete"
    />
  </div>
</template>
