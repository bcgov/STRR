<script setup lang="ts">
import {
  PlatformExpansionBrands,
  PlatformExpansionBusiness,
  PlatformExpansionParties
} from '#components'

const props = defineProps<{ application: HousApplicationResponse }>()
const reg = props.application.registration as ApiBasePlatformApplication

// business data extra formatting
const regOffice = reg.businessDetails.registeredOfficeOrAttorneyForServiceDetails
const hasRegOffice = !!regOffice.attorneyName ||
  !!regOffice.mailingAddress.address ||
  !!regOffice.mailingAddress.addressLineTwo ||
  !!regOffice.mailingAddress.city ||
  !!regOffice.mailingAddress.country ||
  !!regOffice.mailingAddress.postalCode ||
  !!regOffice.mailingAddress.province ||
  !!regOffice.mailingAddress.locationDescription

// party data extra formatting
const compParty = formatPartyUI(reg.completingParty)

const primaryRep = reg.platformRepresentatives.length && reg.platformRepresentatives[0]
  ? formatRepresentativeUI(reg.platformRepresentatives[0])
  : undefined

const secondRep = reg.platformRepresentatives.length > 1 && reg.platformRepresentatives[1]
  ? formatRepresentativeUI(reg.platformRepresentatives[1])
  : undefined

const isCompPartyRep = (
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
    { application: props.application, brands: reg.platformDetails.brands })
}

const expandBusiness = () => {
  expOpen(
    PlatformExpansionBusiness,
    { application: props.application, business: reg.businessDetails, hasRegOffice })
}

const expandParties = () => {
  expOpen(
    PlatformExpansionParties,
    {
      application: props.application,
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
      ...(!isCompPartyRep ? [$t('strr.label.completingParty')] : [])
    ]"
    :col4-labels="[$t('strr.label.noticeOfNonCompliance'), $t('strr.label.takedownRequest')]"
  >
    <template #col1-0>
      <dl class="flex flex-col gap-1 *:whitespace-nowrap md:flex-row">
        <dt class="font-bold text-gray-900">
          {{ $t('strr.label.totalNumberOfListings') }}:
        </dt>
        <dd>{{ $t(`strr.label.listingSize.${reg.platformDetails.listingSize}`) }}</dd>
      </dl>
      <ConnectInfoWithIcon
        v-for="brand in reg.platformDetails.brands.slice(0, 3)"
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
        v-if="reg.platformDetails.brands.length > 3"
        :label="$t('btn.viewAllPlatforms')"
        :padded="false"
        variant="link"
        @click="expandBrands"
      />
    </template>
    <template #col2-0>
      <ConnectInfoWithIcon icon="i-mdi-domain">
        <UButton
          :label="reg.businessDetails.legalName"
          :padded="false"
          variant="link"
          @click="expandBusiness"
        />
      </ConnectInfoWithIcon>
      <ConnectInfoWithIcon icon="i-mdi-email-outline">
        <ConnectFormAddressDisplay :address="formatAddressUI(reg.businessDetails.mailingAddress)" omit-country />
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
    <template v-if="!isCompPartyRep" #col3-2>
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
      <ConnectInfoWithIcon icon="i-mdi-at" :content="reg.businessDetails.noticeOfNonComplianceEmail" />
      <ConnectInfoWithIcon
        v-if="reg.businessDetails.noticeOfNonComplianceOptionalEmail"
        icon="i-mdi-at"
        :content="reg.businessDetails.noticeOfNonComplianceOptionalEmail"
      />
    </template>
    <template #col4-1>
      <ConnectInfoWithIcon icon="i-mdi-at" :content="reg.businessDetails.takeDownRequestEmail" />
      <ConnectInfoWithIcon
        v-if="reg.businessDetails.takeDownRequestOptionalEmail"
        icon="i-mdi-at"
        :content="reg.businessDetails.takeDownRequestOptionalEmail"
      />
    </template>
  </CommonSubHeaderTemplate>
</template>
