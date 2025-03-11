<script setup lang="ts">
import { ConnectPageSection } from '#components'

const exStore = useExaminerStore()
const { activeReg } = storeToRefs(exStore)

const { t } = useI18n()
</script>
<template>
  <ConnectPageSection v-if="activeReg?.documents?.length">
    <div class="divide-y px-10 py-6">
      <ApplicationDetailsSection :label="t('strr.label.supportingInfo')">
        <SupportingDocuments />
      </ApplicationDetailsSection>
    </div>
  </ConnectPageSection>
</template>
