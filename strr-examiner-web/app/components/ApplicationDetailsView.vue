<script setup lang="ts">
const exStore = useExaminerStore()
const { activeReg, isEditingRentalUnit } = storeToRefs(exStore)
</script>

<template>
  <main>
    <div class="bg-white">
      <slot name="header" />
      <HostSubHeader
        v-if="activeReg.registrationType === ApplicationType.HOST"
      />
      <StrataSubHeader
        v-if="activeReg.registrationType === ApplicationType.STRATA_HOTEL"
      />
      <!-- @open-expansion="manageExpansion" -->
      <PlatformSubHeader
        v-if="activeReg.registrationType === ApplicationType.PLATFORM"
      />
    </div>

    <div class="app-inner-container space-y-10 py-10">
      <ConnectExpansionRoot />

      <HostEditRentalUnitForm
        v-if="isEditingRentalUnit"
      />

      <HostSupportingInfo
        v-if="activeReg.registrationType === ApplicationType.HOST"
      />

      <StrataSupportingInfo
        v-if="activeReg.registrationType === ApplicationType.STRATA_HOTEL"
      />

      <!--
        <PlatformDetailsView
        v-if="activeReg.registrationType === ApplicationType.PLATFORM"
      />-->
    </div>
  </main>
</template>
