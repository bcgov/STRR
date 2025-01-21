<script setup lang="ts">

defineProps<{
  title: string,
  primaryRep?: StrrContact,
  secondaryRep?: StrrContact,
  completingParty?: Contact,
  isCompPartyRep?: boolean
}>()
</script>
<template>
  <ConnectFormSection :title>
    <div class="flex space-x-10 *:space-y-1">
      <div v-if="primaryRep">
        <strong class="text-gray-900">{{ $t('strr.label.representative').toUpperCase() }}</strong>
        <ConnectInfoWithIcon icon="i-mdi-account">
          <div class="flex space-x-2">
            <span>{{ getFullName(primaryRep) }}</span>
            <UIcon v-if="isCompPartyRep" class="size-5 shrink-0" name="i-mdi-playlist-check" />
          </div>
        </ConnectInfoWithIcon>
        <ConnectInfoWithIcon icon="i-mdi-wallet-travel" :content="primaryRep.position" />
        <ConnectInfoWithIcon icon="i-mdi-phone" :content="getPhoneDisplay(primaryRep.phone)" />
        <ConnectInfoWithIcon v-if="primaryRep.faxNumber" icon="i-mdi-fax" :content="primaryRep.faxNumber" />
        <ConnectInfoWithIcon icon="i-mdi-at" :content="primaryRep.emailAddress" />
      </div>
      <div v-if="secondaryRep">
        <strong class="text-gray-900">{{ $t('strr.label.secondaryRepresentative').toUpperCase() }}</strong>
        <ConnectInfoWithIcon icon="i-mdi-account" :content="getFullName(secondaryRep)" />
        <ConnectInfoWithIcon icon="i-mdi-wallet-travel" :content="secondaryRep.position" />
        <ConnectInfoWithIcon icon="i-mdi-phone" :content="getPhoneDisplay(secondaryRep.phone)" />
        <ConnectInfoWithIcon v-if="secondaryRep.faxNumber" icon="i-mdi-fax" :content="secondaryRep.faxNumber" />
        <ConnectInfoWithIcon icon="i-mdi-at" :content="secondaryRep.emailAddress" />
      </div>
      <div v-if="completingParty">
        <strong class="text-gray-900">{{ $t('strr.label.completingParty').toUpperCase() }}</strong>
        <ConnectInfoWithIcon icon="i-mdi-account" :content="getFullName(completingParty)" />
        <ConnectInfoWithIcon icon="i-mdi-phone" :content="getPhoneDisplay(completingParty.phone)" />
        <ConnectInfoWithIcon v-if="completingParty.faxNumber" icon="i-mdi-fax" :content="completingParty.faxNumber" />
        <ConnectInfoWithIcon icon="i-mdi-at" :content="completingParty.emailAddress" />
      </div>
    </div>
  </ConnectFormSection>
</template>
