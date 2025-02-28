<script setup lang="ts">
defineProps<{
  application: HousApplicationResponse
}>()
</script>

<template>
  <main>
    <div class="bg-white">
      <slot name="header" />
      <HostSubHeader
        v-if="application?.registration.registrationType === ApplicationType.HOST"
        :application="application"
      />
      <StrataSubHeader
        v-if="application?.registration.registrationType === ApplicationType.STRATA_HOTEL"
        :application="application"
      />
      <!-- @open-expansion="manageExpansion" -->
      <PlatformSubHeader
        v-if="application?.registration.registrationType === ApplicationType.PLATFORM"
        :application="application"
      />
    </div>

    <div class="app-inner-container space-y-10 py-10">
      <ConnectExpansionRoot />

      <HostSupportingInfo
        v-if="application?.registration.registrationType === ApplicationType.HOST"
        :application="application"
      />

      <StrataSupportingInfo
        v-if="application?.registration.registrationType === ApplicationType.STRATA_HOTEL"
        :application="application"
      />

      <!--
        <PlatformDetailsView
        v-if="application?.registration.registrationType === ApplicationType.PLATFORM"
        :application="application"
      />-->
    </div>
  </main>
</template>
