<script setup lang="ts">

const { t } = useI18n()
const exStore = useExaminerStore()
const { activeHeader, activeReg, isFilingHistoryOpen } = storeToRefs(exStore)
const { toggleFilingHistory, checkAndPerformAction } = useHostExpansion()
const localePath = useLocalePath()

const getBadgeColor = (status: ApplicationStatus): string => {
  switch (status) {
    case ApplicationStatus.DECLINED:
    case ApplicationStatus.PROVISIONALLY_DECLINED:
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

const goToRegistration = async (registrationId: string) => {
  await navigateTo(localePath(`${RoutesE.REGISTRATION}/${registrationId}`))
}

const nocCountdown = computed(() => {
  const daysLeft = dayCountdown(activeHeader.value.nocEndDate.toString(), false)
  return {
    days: daysLeft,
    isExpired: activeHeader.value.status === ApplicationStatus.NOC_EXPIRED
  }
})

const registrationCountdown = computed(() => {
  const daysLeft = dayCountdown(activeHeader.value.registrationEndDate.toString(), false)
  return {
    days: daysLeft,
    isExpired: daysLeft < 0
  }
})

</script>
<template>
  <div class="border-b bg-white py-6">
    <div class="app-inner-container">
      <div class="mb-4 flex justify-between text-2xl leading-none">
        <div class="flex items-center space-x-3">
          <span
            class="border-r-2 border-gray-700 pr-3 font-bold"
            data-testid="application-number"
          >
            {{ activeHeader?.applicationNumber }}
          </span>
          <span
            v-if="getApplicationName()"
            class="border-r-2 border-gray-700 pr-3"
            data-testid="application-name"
          >
            {{ getApplicationName() }}
          </span>
          <span
            v-if="activeReg.registrationType === ApplicationType.STRATA_HOTEL"
            class="border-r-2 border-gray-700 pr-3"
          >
            <UButton
              icon="mdi-web"
              :padded="false"
              variant="link"
              :to="(activeReg as ApiBaseStrataApplication).strataHotelDetails.brand.website"
              target="_blank"
              data-testid="strata-brand-website"
            />
          </span>
          <UButton
            :label="isFilingHistoryOpen ? t('btn.hideHistory') : t('btn.showHistory')"
            :padded="false"
            variant="link"
            icon="i-mdi-history"
            size="sm"
            class="gap-1"
            data-testid="toggle-history-btn"
            @click="checkAndPerformAction(() => toggleFilingHistory())"
          />
        </div>
        <UButton
          v-if="activeHeader?.status !== ApplicationStatus.PAYMENT_DUE"
          icon="i-mdi-receipt-text-outline"
          :padded="false"
          variant="link"
          data-testid="view-receipt-button"
          class="gap-1 underline"
          @click="exStore.viewReceipt(activeHeader?.applicationNumber)"
        >
          {{ t('btn.viewReceipt') }}
        </UButton>
      </div>
      <div class="mb-2 text-sm">
        <UBadge
          v-if="activeHeader.isSetAside"
          class="bg-bcGovColor-midGray mr-3 font-bold uppercase"
          :label="t('strr.label.setAside')"
          variant="solid"
          data-testid="application-set-aside-badge"
        />
        <UBadge
          v-else
          class="mr-3 font-bold uppercase"
          :label="activeHeader.examinerStatus"
          :color="getBadgeColor(activeHeader.status)"
          data-testid="application-status-badge"
        />
        <strong>{{ t('strr.label.applicationType') }}</strong>
        {{ t(`applicationType.${activeReg?.registrationType}`) }} |
        <strong>{{ t('strr.label.submitted') }}</strong>
        {{ dateToString(activeHeader.applicationDateTime, 'y-MM-dd a', true) }}
        ({{ dayCountdown(activeHeader.applicationDateTime.toString(), true) }} days ago)
        <template v-if="activeHeader.nocEndDate">
          | <strong>{{ t('strr.label.nocExpiry') }}</strong>
          {{ dateToString(activeHeader.nocEndDate, 'y-MM-dd a', true) }}
          <span v-if="!nocCountdown.isExpired">{{ `(${nocCountdown.days} days left)` }}</span>
          <span v-else class="font-bold text-red-500"> (EXPIRED)</span>
        </template>
        | <strong>{{ t('strr.label.assignee') }}</strong>
        {{ activeHeader.reviewer?.username || '-' }}
      </div>
      <div
        v-if="activeHeader?.registrationNumber"
        class="text-sm"
      >
        <strong class="mr-1">{{ t('strr.label.registrationNumber') }}</strong>
        <span
          class="text-bcGovColor-activeBlue cursor-pointer underline"
          @click="goToRegistration(activeHeader?.registrationId)"
        >
          {{ activeHeader?.registrationNumber }}
        </span>
        | <strong>{{ t('strr.label.registrationDate') }}</strong>
        {{ dateToString(activeHeader.registrationStartDate, 'y-MM-dd', true) }}
        | <strong>{{ t('strr.label.registrationEndDate') }}</strong>
        {{ dateToString(activeHeader.registrationEndDate, 'y-MM-dd', true) }}
        <span v-if="!registrationCountdown.isExpired">{{ `(${registrationCountdown.days} days left)` }}</span>
        <span v-else class="font-bold text-red-500"> (EXPIRED)</span>
      </div>
    </div>
  </div>
</template>
