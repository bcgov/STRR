<script setup lang="ts">
const exStore = useExaminerStore()
const { activeReg } = storeToRefs(exStore)

const businessDetails = activeReg.value.businessDetails
const attorney = businessDetails.registeredOfficeOrAttorneyForServiceDetails
const hasAttorneyAddress = Object.values(attorney.mailingAddress).some(Boolean)

</script>

<template>
  <CommonExpansionTemplate
    :label="$t('strr.label.businesses')"
  >
    <div class="flex gap-x-10">
      <div class="space-y-2">
        <b>{{ $t('strr.label.business').toUpperCase() }}</b>
        <ConnectInfoWithIcon
          icon="i-mdi-domain"
          :content="businessDetails?.legalName"
        />
        <ConnectInfoWithIcon
          v-if="businessDetails?.businessNumber"
          icon="i-mdi-pound"
          :content="businessDetails?.businessNumber"
        />
        <ConnectInfoWithIcon
          icon="i-mdi-envelope-outline"
          :content="displayFullAddress(businessDetails.mailingAddress)"
        />
        <ConnectInfoWithIcon
          v-if="businessDetails?.homeJurisdiction"
          icon="i-mdi-map-outline"
          :content="businessDetails?.homeJurisdiction"
        />
      </div>
      <div
        v-if="attorney.attorneyName || hasAttorneyAddress"
        class="space-y-2"
      >
        <b>{{ $t('strr.label.attorneyForService').toUpperCase() }}</b>
        <ConnectInfoWithIcon
          v-if="attorney.attorneyName"
          icon="i-mdi-domain"
          :content="attorney.attorneyName"
        />
        <ConnectInfoWithIcon
          v-if="hasAttorneyAddress"
          icon="i-mdi-map-marker-outline"
          :content="displayFullAddress(attorney.mailingAddress)"
        />
      </div>
    </div>
  </CommonExpansionTemplate>
</template>
