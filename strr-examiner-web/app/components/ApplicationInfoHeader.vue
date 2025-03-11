<script setup lang="ts">

const exStore = useExaminerStore()
const { activeHeader, activeReg } = storeToRefs(exStore)

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

const getApplicationName = (): string => {
  switch (activeReg.value.registrationType) {
    case ApplicationType.STRATA_HOTEL:
      return (activeReg.value as ApiBaseStrataApplication).businessDetails.legalName
    case ApplicationType.HOST:
      return (activeReg.value as ApiHostApplication).unitAddress?.nickname || ''
    case ApplicationType.PLATFORM:
      return (activeReg.value as ApiBasePlatformApplication).businessDetails?.legalName || ''
    default:
      return ''
  }
}

</script>
<template>
  <div class="border-b bg-white py-6">
    <div class="app-inner-container">
      <div class="mb-2 text-2xl">
        <strong>
          {{ activeHeader?.applicationNumber }} |
        </strong>
        {{ getApplicationName() }}
        <UButton
          v-if="activeReg.registrationType === ApplicationType.STRATA_HOTEL"
          icon="mdi-web"
          :padded="false"
          variant="link"
          :to="(activeReg as ApiBaseStrataApplication).strataHotelDetails.brand.website"
          target="_blank"
          data-testid="strata-brand-website"
        />
      </div>
      <div class="text-sm">
        <UBadge
          class="mr-3 font-bold"
          :label="activeHeader.examinerStatus"
          :color="getBadgeColor(activeHeader.status)"
        />
        <strong>Type:</strong>
        {{ $t(`applicationType.${activeReg?.registrationType}`) }} |
        <strong>Submitted:</strong> {{ dateToString(activeHeader.applicationDateTime, 'y-MM-dd t') }}
        ({{ dayCountdown(activeHeader.applicationDateTime.toString(), true) }} days ago)
      </div>
    </div>
  </div>
</template>
