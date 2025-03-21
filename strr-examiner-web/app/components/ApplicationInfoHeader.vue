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
    case ApplicationStatus.NOC_PENDING:
    case ApplicationStatus.NOC_EXPIRED:
      return 'yellow'
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

const nocCountdown = computed(() => {
  const daysLeft = dayCountdown(activeHeader.value.nocEndDate.toString(), false)
  return {
    days: daysLeft,
    isExpired: activeHeader.value.status === ApplicationStatus.NOC_EXPIRED
  }
})

</script>
<template>
  <div class="border-b bg-white py-6">
    <div class="app-inner-container">
      <div class="flex justify-between mb-2 text-2xl">
        <div>
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
        <UButton
          icon="i-mdi-receipt-text-outline"
          :padded="false"
          variant="link"
          data-testid="view-receipt-button"
          class="underline"
          @click="exStore.downloadReceipt(activeHeader?.applicationNumber)"
        >
          View Receipt
        </UButton>
      </div>
      <div class="text-sm">
        <UBadge
          class="mr-3 font-bold uppercase"
          :label="activeHeader.examinerStatus"
          :color="getBadgeColor(activeHeader.status)"
        />
        <strong>Type:</strong>
        {{ $t(`applicationType.${activeReg?.registrationType}`) }} |
        <strong>Submitted:</strong> {{ dateToString(activeHeader.applicationDateTime, 'y-MM-dd a') }}
        ({{ dayCountdown(activeHeader.applicationDateTime.toString(), true) }} days ago)
        <template v-if="activeHeader.nocEndDate">
          | <strong>NOC Expiry:</strong> {{ dateToString(activeHeader.nocEndDate, 'y-MM-dd a') }}
          <span v-if="!nocCountdown.isExpired">{{ `(${nocCountdown.days} days left)` }}</span>
          <span v-else class="font-bold text-red-500"> (EXPIRED)</span>
        </template>
      </div>
    </div>
  </div>
</template>
