<script setup lang="ts">
const props = defineProps<{
  data: HousApplicationResponse | HousRegistrationResponse
}>()

const isApplication = 'registration' in props.data
const reg = isApplication
  ? props.data.registration
  : props.data

const getStrataData = (): StrataApplicationResp | StrataHotelRegistrationResp => {
  return props.data as StrataApplicationResp | StrataHotelRegistrationResp
}
</script>

<template>
  <main>
    <div class="bg-white">
      <slot name="header" />
      <HostSubHeader
        v-if="reg.registrationType === ApplicationType.HOST"
        :data="data"
      />
      <StrataSubHeader
        v-if="reg.registrationType === ApplicationType.STRATA_HOTEL"
        :data="getStrataData()"
      />
      <!-- @open-expansion="manageExpansion" -->
      <PlatformSubHeader
        v-if="reg.registrationType === ApplicationType.PLATFORM"
        :data="data"
      />
    </div>

    <div class="app-inner-container space-y-10 py-10">
      <ConnectExpansionRoot />

      <HostSupportingInfo
        v-if="reg.registrationType === ApplicationType.HOST"
        :data="data"
      />

      <StrataSupportingInfo
        v-if="reg.registrationType === ApplicationType.STRATA_HOTEL"
        :data="getStrataData()"
      />

      <!--
        <PlatformDetailsView
        v-if="reg.registrationType === ApplicationType.PLATFORM"
        :data="data"
      />-->
    </div>
  </main>
</template>
