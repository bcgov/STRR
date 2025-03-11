<script setup lang="ts">
import {
  PlatformExpansionBrands,
  PlatformExpansionBusiness,
  PlatformExpansionParties
} from '#components'

const exStore = useExaminerStore()
const { activeReg, isApplication } = storeToRefs(exStore)

// business data extra formatting
const regOffice = activeReg.value.businessDetails.registeredOfficeOrAttorneyForServiceDetails
const hasRegOffice = !!regOffice.attorneyName ||
  !!regOffice.mailingAddress.address ||
  !!regOffice.mailingAddress.addressLineTwo ||
  !!regOffice.mailingAddress.city ||
  !!regOffice.mailingAddress.country ||
  !!regOffice.mailingAddress.postalCode ||
  !!regOffice.mailingAddress.province ||
  !!regOffice.mailingAddress.locationDescription

// party data extra formatting
const compParty = isApplication.value
  ? formatPartyUI(activeReg.value.completingParty)
  : undefined

const primaryRep = activeReg.value.platformRepresentatives.length && activeReg.value.platformRepresentatives[0]
  ? formatRepresentativeUI(activeReg.value.platformRepresentatives![0])
  : undefined

const secondRep = activeReg.value.platformRepresentatives.length > 1 && activeReg.value.platformRepresentatives[1]
  ? formatRepresentativeUI(activeReg.value.platformRepresentatives![1])
  : undefined

const isCompPartyRep = !!compParty && !!primaryRep && (
  primaryRep?.firstName === compParty.firstName &&
  primaryRep?.middleName === compParty.middleName &&
  primaryRep?.lastName === compParty.lastName &&
  primaryRep?.emailAddress === compParty.emailAddress &&
  primaryRep?.phone.countryCode === compParty.phone.countryCode &&
  primaryRep?.phone.number === compParty.phone.number &&
  primaryRep?.phone.extension === compParty.phone.extension
)

const { open: expOpen } = useStrrExpansion()

const expandBrands = () => {
  expOpen(
    PlatformExpansionBrands,
    { brands: activeReg.value.platformDetails.brands })
}

const expandBusiness = () => {
  expOpen(
    PlatformExpansionBusiness,
    { business: activeReg.value.businessDetails, hasRegOffice })
}

const expandParties = () => {
  expOpen(
    PlatformExpansionParties,
    {
      primaryRep,
      secondaryRep: secondRep,
      completingParty: compParty
    })
}
</script>
<template>
  <CommonSubHeaderTemplate
    :col1-labels="[$t('strr.label.platforms')]"
    :col2-labels="[
      $t('strr.label.business'),
      ...(hasRegOffice ? [$t('strr.label.attorneyForService')] : [])
    ]"
    :col3-labels="[
      $t('strr.label.representative'),
      ...(secondRep ? [$t('strr.label.secondaryRepresentative')] : []),
      ...(!isCompPartyRep && compParty ? [$t('strr.label.completingParty')] : [])
    ]"
    :col4-labels="[$t('strr.label.noticeOfNonCompliance'), $t('strr.label.takedownRequest')]"
  >
    <template #col1-0>
      <dl class="flex flex-col gap-1 *:whitespace-nowrap md:flex-row">
        <dt class="font-bold text-gray-900">
          {{ $t('strr.label.totalNumberOfListings') }}:
        </dt>
        <dd>{{ $t(`strr.label.listingSize.${activeReg.platformDetails.listingSize}`) }}</dd>
      </dl>
      <ConnectInfoWithIcon
        v-for="brand in activeReg.platformDetails.brands.slice(0, 3)"
        :key="brand.name"
        icon="i-mdi-web"
      >
        <UButton
          class="underline underline-offset-2"
          icon="i-mdi-open-in-new"
          :label="brand.name"
          :padded="false"
          :to="brand.website"
          target="_blank"
          trailing
          variant="link"
        />
      </ConnectInfoWithIcon>
      <UButton
        v-if="activeReg.platformDetails.brands.length > 3"
        :label="$t('btn.viewAllPlatforms')"
        :padded="false"
        variant="link"
        @click="expandBrands"
      />
    </template>
    <template #col2-0>
      <ConnectInfoWithIcon icon="i-mdi-domain">
        <UButton
          :label="activeReg.businessDetails.legalName"
          :padded="false"
          variant="link"
          @click="expandBusiness"
        />
      </ConnectInfoWithIcon>
      <ConnectInfoWithIcon icon="i-mdi-email-outline">
        <ConnectFormAddressDisplay
          :address="formatAddressUI(activeReg.businessDetails.mailingAddress)"
          omit-country
        />
      </ConnectInfoWithIcon>
    </template>
    <template v-if="hasRegOffice" #col2-1>
      <ConnectInfoWithIcon v-if="regOffice.attorneyName" icon="i-mdi-domain" :content="regOffice.attorneyName" />
      <ConnectInfoWithIcon icon="i-mdi-location-outline">
        <ConnectFormAddressDisplay :address="formatAddressUI(regOffice.mailingAddress)" omit-country />
      </ConnectInfoWithIcon>
    </template>
    <template v-if="primaryRep" #col3-0>
      <ConnectInfoWithIcon icon="i-mdi-account">
        <UButton
          :label="getFullName(primaryRep)"
          :icon="isCompPartyRep ? 'i-mdi-playlist-check' : ''"
          :padded="false"
          trailing
          variant="link"
          @click="expandParties"
        />
      </ConnectInfoWithIcon>
      <ConnectInfoWithIcon icon="i-mdi-phone" :content="getPhoneDisplay(primaryRep.phone)" />
      <ConnectInfoWithIcon icon="i-mdi-at" :content="primaryRep.emailAddress" />
    </template>
    <template v-if="secondRep" #col3-1>
      <ConnectInfoWithIcon icon="i-mdi-account">
        <UButton
          :label="getFullName(secondRep)"
          :padded="false"
          variant="link"
          @click="expandParties"
        />
      </ConnectInfoWithIcon>
    </template>
    <template v-if="compParty && !isCompPartyRep" #col3-2>
      <ConnectInfoWithIcon icon="i-mdi-account">
        <UButton
          :label="getFullName(compParty)"
          icon="i-mdi-playlist-check"
          :padded="false"
          trailing
          variant="link"
          @click="expandParties"
        />
      </ConnectInfoWithIcon>
    </template>
    <template #col4-0>
      <ConnectInfoWithIcon icon="i-mdi-at" :content="activeReg.businessDetails.noticeOfNonComplianceEmail" />
      <ConnectInfoWithIcon
        v-if="activeReg.businessDetails.noticeOfNonComplianceOptionalEmail"
        icon="i-mdi-at"
        :content="activeReg.businessDetails.noticeOfNonComplianceOptionalEmail"
      />
    </template>
    <template #col4-1>
      <ConnectInfoWithIcon icon="i-mdi-at" :content="activeReg.businessDetails.takeDownRequestEmail" />
      <ConnectInfoWithIcon
        v-if="activeReg.businessDetails.takeDownRequestOptionalEmail"
        icon="i-mdi-at"
        :content="activeReg.businessDetails.takeDownRequestOptionalEmail"
      />
    </template>
  </CommonSubHeaderTemplate>
</template>
