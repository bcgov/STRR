<script setup lang="ts">
import { ConnectPageSection } from '#components'

const props = defineProps<{
  data: StrataApplicationResp | StrataHotelRegistrationResp
}>()
const isApplication = 'registration' in props.data
const reg = isApplication
  ? props.data.registration
  : props.data

const { t } = useI18n()
</script>
<template>
  <ConnectPageSection v-if="reg?.documents?.length">
    <div class="divide-y px-10 py-6">
      <ApplicationDetailsSection :label="t('strr.label.supportingInfo')">
        <SupportingDocuments :data />
      </ApplicationDetailsSection>
    </div>
  </ConnectPageSection>
</template>
