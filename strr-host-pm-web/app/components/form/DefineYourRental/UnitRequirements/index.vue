<script setup lang="ts">
defineProps<{ isComplete: boolean }>()
const reqStore = usePropertyReqStore()
</script>
<template>
  <!-- TODO: test only the correct state is shown for the different provided scenarios -->
  <!-- TODO: define correct order for v-ifs, manage with function ?? -->
  <div class="flex flex-col gap-4">
    <FormDefineYourRentalUnitRequirementsError
      v-if="reqStore.propertyReqError.type !== undefined"
    />

    <FormDefineYourRentalUnitRequirementsStraaExempt
      v-else-if="reqStore.propertyReqs.isStraaExempt === true"
    />

    <FormDefineYourRentalUnitRequirementsStrProhibited
      v-else-if="reqStore.propertyReqs.isStrProhibited === true"
    />

    <FormDefineYourRentalUnitRequirementsPrExempt
      v-else-if="reqStore.propertyReqs.isPrincipalResidenceRequired === false && reqStore.requirementsList.length === 0"
    />

    <FormDefineYourRentalUnitRequirementsList
      v-if="reqStore.requirementsList.length > 0"
    />

    <FormDefineYourRentalUnitRequirementsPrRequired
      v-if="reqStore.propertyReqs.isPrincipalResidenceRequired === true"
      :is-complete="isComplete"
    />
  </div>
</template>
