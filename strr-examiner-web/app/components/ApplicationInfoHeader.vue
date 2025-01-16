<script setup lang="ts">
import { type HousApplicationResponse } from '~/types/application-response'
defineProps<{ application: HousApplicationResponse }>()

const getBadgeColor = (status: ApplicationStatus): string => {
  switch (status) {
    case ApplicationStatus.DECLINED:
      return 'red'
    case ApplicationStatus.AUTO_APPROVED:
    case ApplicationStatus.FULL_REVIEW_APPROVED:
    case ApplicationStatus.PROVISIONALLY_APPROVED:
      return 'green'
    default:
      return 'primary'
  }
}
</script>
<template>
  <div class="border-b bg-white py-6">
    <div v-if="application.registration.registrationType === ApplicationType.HOST" class="app-inner-container">
      <div class="mb-2 text-2xl">
        <strong>
          {{ application.header?.applicationNumber }} |
        </strong>
        {{ application.registration.unitAddress?.nickname }}
      </div>
      <div class="text-sm">
        <UBadge
          class="mr-3 font-bold"
          :label="application.header.examinerStatus"
          :color="getBadgeColor(application.header.status)"
        />
        <strong>Type:</strong>
        {{ $t(`applicationType.${application.registration?.registrationType}`) }} |
        <strong>Submitted:</strong> {{ dateToString(application.header.applicationDateTime, 'y-MM-dd t') }}
        ({{ dayCountdown(application.header.applicationDateTime.toString(), true) }} days ago)
      </div>
    </div>
    <div v-else>
      Complete Strata/Platform Header
    </div>
  </div>
</template>
