<script setup lang="ts">

defineProps<{ business: ApiPlatformBusinessDetails, hasRegOffice: boolean }>()
</script>
<template>
  <CommonExpansionTemplate :label="$t('strr.label.business')">
    <div class="flex space-x-10 *:space-y-1">
      <div>
        <strong class="text-gray-900">{{ $t('strr.label.business').toUpperCase() }}</strong>
        <ConnectInfoWithIcon icon="i-mdi-domain" :content="business.legalName" />
        <ConnectInfoWithIcon v-if="business.businessNumber" icon="i-mdi-hashtag" :content="business.businessNumber" />
        <ConnectInfoWithIcon icon="i-mdi-email-outline">
          <ConnectFormAddressDisplay :address="formatAddressUI(business.mailingAddress)" omit-country />
        </ConnectInfoWithIcon>
        <dl
          v-if="business.consumerProtectionBCLicenceNumber"
          class="flex flex-col gap-1 *:whitespace-nowrap md:flex-row"
        >
          <dt class="font-bold text-gray-900">
            {{ $t('strr.label.cpbcLicenseNum') }}:
          </dt>
          <dd>{{ business.consumerProtectionBCLicenceNumber }}</dd>
        </dl>
      </div>
      <div v-if="hasRegOffice">
        <strong class="text-gray-900">{{ $t('strr.label.attorneyForService').toUpperCase() }}</strong>
        <ConnectInfoWithIcon
          v-if="business.registeredOfficeOrAttorneyForServiceDetails.attorneyName"
          icon="i-mdi-domain"
          :content="business.registeredOfficeOrAttorneyForServiceDetails.attorneyName"
        />
        <ConnectInfoWithIcon icon="i-mdi-location-outline">
          <ConnectFormAddressDisplay
            :address="formatAddressUI(business.registeredOfficeOrAttorneyForServiceDetails.mailingAddress)"
            omit-country
          />
        </ConnectInfoWithIcon>
      </div>
    </div>
  </CommonExpansionTemplate>
</template>
