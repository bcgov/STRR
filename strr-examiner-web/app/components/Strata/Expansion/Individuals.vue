<script setup lang="ts">
const props = defineProps<{
  data: StrataApplicationPayload | StrataHotelRegistrationResp
}>()
const isApplication = 'registration' in props.data
const reg = isApplication
  ? props.data.registration
  : props.data

const { strataHotelRepresentatives, completingParty } = reg

</script>

<template>
  <CommonExpansionTemplate
    :label="$t('strr.label.individuals')"
  >
    <div class="flex">
      <div v-for="(rep, index) in strataHotelRepresentatives" :key="index" class="w-1/3 space-y-2">
        <b>{{ index === 0
          ? $t('strr.label.representative').toUpperCase() :
            $t('strr.label.secondaryRepresentative').toUpperCase()
        }}</b>
        <ConnectInfoWithIcon
          icon="i-mdi-account"
          :content="displayContactFullName(rep as ApiRep)"
        />
        <ConnectInfoWithIcon
          v-if="rep?.jobTitle"
          icon="i-mdi-briefcase-outline"
          :content="rep?.jobTitle"
        />
        <ConnectInfoWithIcon
          v-if="rep?.phoneNumber"
          icon="i-mdi-phone"
          :content="displayPhoneAndExt(rep?.phoneNumber)"
        />
        <ConnectInfoWithIcon
          v-if="rep?.faxNumber"
          icon="i-mdi-fax"
          :content="displayPhoneAndExt(rep?.faxNumber)"
        />
        <ConnectInfoWithIcon
          icon="i-mdi-at"
          :content="rep?.emailAddress"
        />
      </div>
      <div class="space-y-2">
        <b>{{ $t('strr.label.completingParty').toUpperCase() }}</b>
        <ConnectInfoWithIcon
          icon="i-mdi-account"
          :content="displayContactFullName(completingParty)"
        />
        <ConnectInfoWithIcon
          v-if="completingParty.phoneNumber"
          icon="i-mdi-phone"
          :content="displayPhoneAndExt(completingParty.phoneNumber)"
        />
        <ConnectInfoWithIcon
          icon="i-mdi-envelope-outline"
          :content="completingParty.emailAddress"
        />
      </div>
    </div>
  </CommonExpansionTemplate>
</template>

<style scoped></style>
