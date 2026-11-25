<script setup lang="ts">
const exStore = useExaminerStore()
const { isApplication, activeReg } = storeToRefs(exStore)
const { strataHotelRepresentatives } = activeReg.value
const compParty = isApplication.value
  ? activeReg.value.completingParty
  : undefined

</script>

<template>
  <CommonExpansionTemplate
    :label="$t('strr.label.individuals')"
  >
    <div class="flex gap-x-6">
      <div
        v-for="(rep, index) in strataHotelRepresentatives"
        :key="index"
        class="w-1/3 min-w-0 space-y-2 [overflow-wrap:anywhere]"
      >
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
      <div v-if="isApplication" class="min-w-0 flex-1 space-y-2 [overflow-wrap:anywhere]">
        <b>{{ $t('strr.label.completingParty').toUpperCase() }}</b>
        <ConnectInfoWithIcon
          icon="i-mdi-account"
          :content="displayContactFullName(compParty)"
        />
        <ConnectInfoWithIcon
          v-if="compParty.phoneNumber"
          icon="i-mdi-phone"
          :content="displayPhoneAndExt(compParty.phoneNumber)"
        />
        <ConnectInfoWithIcon
          icon="i-mdi-envelope-outline"
          :content="compParty.emailAddress"
        />
      </div>
    </div>
  </CommonExpansionTemplate>
</template>

<style scoped></style>
