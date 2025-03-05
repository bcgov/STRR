<script setup lang="ts">

const props = defineProps<{ data: HousRegistrationResponse }>()
const { header } = props.data
const registration = props.data

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
  switch (registration.registrationType) {
    case ApplicationType.STRATA_HOTEL:
      return (registration as StrataHotelRegistrationResp).businessDetails?.legalName || ''
    case ApplicationType.HOST:
      return (registration as HostRegistrationResp).unitAddress?.nickname || ''
    case ApplicationType.PLATFORM:
      return (registration as PlatformRegistrationResp).businessDetails?.legalName || ''
    default:
      return ''
  }
}

const getRegistrationType = (): string => {
  switch (registration.registrationType) {
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
        <div class="mb-2 text-2xl">
          <strong>
            {{ registration.registrationNumber }} |
          </strong>
          {{ getApplicationName() }}
          <UButton
            v-if="registration.registrationType === ApplicationType.STRATA_HOTEL"
            icon="mdi-web"
            :padded="false"
            variant="link"
            :to="(registration as StrataHotelRegistrationResp).strataHotelDetails?.brand.website"
            target="_blank"
            data-testid="strata-brand-website"
          />
        </div>
        <div class="text-sm">
          <UBadge
            class="mr-3 font-bold"
            :label="header.examinerStatus"
            :color="getBadgeColor(registration.status!)"
          />
          <strong>Registration Date:</strong>
          {{ dateToString(registration.startDate, 'y-MM-dd t') }}
          <strong>Expiry Date:</strong> {{ dateToString(registration.expiryDate, 'y-MM-dd t') }}
          ({{ dayCountdown(registration.expiryDate.toString()) }} days left)
        </div>
      </div>
      <div class="text-sm">
        <strong>Application Number:</strong>
        {{ header.applicationNumber }} |
        <strong>Type:</strong>
        {{ getRegistrationType() }} |
        <strong>Submitted:</strong>
        {{ header.applicationDateTime }} |
        <template v-if="header.reviewer?.username">
          <strong>Approved By:</strong>
          {{ header.reviewer.username }}
        </template>
      </div>
    </div>
  </div>
</template>
