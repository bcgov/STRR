<script setup lang="ts">

const { t } = useI18n()
const exStore = useExaminerStore()
const { activeReg, activeHeader, isFilingHistoryOpen } = storeToRefs(exStore)
const { toggleFilingHistory, checkAndPerformAction } = useHostExpansion()

const getBadgeColor = (status: RegistrationStatus): string => {
  switch (status) {
    case RegistrationStatus.EXPIRED:
      return 'red'
    case RegistrationStatus.ACTIVE:
      return 'green'
    case RegistrationStatus.SUSPENDED:
      return 'blue'
    case RegistrationStatus.CANCELLED:
      return 'red'
    default:
      return 'primary'
  }
}

const getApplicationName = (): string => {
  switch (activeReg.value.registrationType) {
    case ApplicationType.STRATA_HOTEL:
      return (activeReg.value as StrataHotelRegistrationResp).businessDetails?.legalName || ''
    case ApplicationType.HOST:
      return (activeReg.value as HostRegistrationResp).unitAddress?.nickname || ''
    case ApplicationType.PLATFORM:
      return (activeReg.value as PlatformRegistrationResp).businessDetails?.legalName || ''
    default:
      return ''
  }
}

const getRegistrationType = (): string => {
  switch (activeReg.value.registrationType) {
    case ApplicationType.STRATA_HOTEL:
      return 'Strata Hotel'
    case ApplicationType.HOST:
      return 'Host'
    case ApplicationType.PLATFORM:
      return 'Platform'
    default:
      return '-'
  }
}

</script>
<template>
  <div class="border-b bg-white py-6">
    <div class="app-inner-container">
      <div class="mb-2">
        <div class="mb-4 flex justify-between text-2xl leading-none">
          <div class="flex items-center space-x-3">
            <span class="border-r-2 border-gray-700 pr-3 font-bold">
              {{ activeReg.registrationNumber }}
            </span>
            <span
              v-if="getApplicationName()"
              class="border-r-2 border-gray-700 pr-3"
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
                :to="(activeReg as StrataHotelRegistrationResp).strataHotelDetails?.brand.website"
                target="_blank"
                data-testid="strata-brand-website"
              />
            </span>
            <UButton
              :label="isFilingHistoryOpen ? $t('btn.hideHistory') : $t('btn.showHistory')"
              :padded="false"
              variant="link"
              icon="i-mdi-history"
              size="sm"
              class="gap-1"
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
            {{ $t('btn.viewReceipt') }}
          </UButton>
        </div>
        <div class="text-sm">
          <UBadge
            v-if="activeHeader.isSetAside"
            class="mr-3 bg-bcGovColor-midGray font-bold uppercase"
            :label="t('strr.label.setAside')"
            variant="solid"
          />
          <UBadge
            v-else
            class="mr-3 font-bold uppercase"
            :label="activeHeader.examinerStatus"
            :color="getBadgeColor(activeReg.status!)"
            data-testid="registration-status-badge"
          />
          <strong>{{ t('strr.label.registrationDate') }}</strong>
          {{ dateToString(activeReg.startDate, 'y-MM-dd', true) }} |
          <span
            v-if="activeReg.status === RegistrationStatus.CANCELLED"
            data-testid="reg-cancel-date"
          >
            <b>{{ t('strr.label.cancelledDate') }}</b>
            {{ activeReg.cancelledDate ? dateToString(activeReg.cancelledDate, 'y-MM-dd', true) : '-' }}
          </span>
          <span
            v-else
            data-testid="reg-expiry-date"
          >
            <strong>{{ t('strr.label.expiryDate') }}</strong>
            {{ dateToString(activeReg.expiryDate, 'y-MM-dd', true) }}
            ({{ dayCountdown(activeReg.expiryDate.toString()) }} days left)
          </span>
        </div>
      </div>
      <div class="text-sm">
        <strong>Application Number:</strong>
        {{ activeHeader.applicationNumber }} |
        <strong>Type:</strong>
        {{ getRegistrationType() }} |
        <strong>{{ t('strr.label.submitted') }}</strong>
        {{ dateToString(activeHeader.applicationDateTime, 'y-MM-dd', true) }}
        | <strong>{{ t('strr.label.assignee') }}</strong>
        {{ activeHeader.reviewer?.username || '-' }}
        <template v-if="activeHeader.reviewer?.username">
          | <strong>Approved By:</strong>
          {{ activeHeader.reviewer.username }}
        </template>
      </div>
    </div>
  </div>
</template>
