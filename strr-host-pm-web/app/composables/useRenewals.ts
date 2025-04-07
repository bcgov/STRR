import { DateTime } from 'luxon'

// Registration Renewals composable
export const useRenewals = () => {
  const { getRegistrationRenewalStatus } = useStrrApi()
  const { registration } = storeToRefs(useHostPermitStore())

  const isEligibleForRenewal = ref(false)

  // TODO: this should be done on API side
  const isRegistrationRenewable = computed((): boolean =>
    // statuses when registration is renewable
    registration.value?.status === RegistrationStatus.ACTIVE ||
    registration.value?.status === RegistrationStatus.EXPIRED
  )

  // converts expiry date to medium format date, eg Apr 1, 2025
  const renewalDueDate = computed((): string =>
    DateTime.fromISO(registration.value?.expiryDate).toLocaleString(DateTime.DATE_MED)
  )

  // number of days for renewal due date
  const renewalDateCounter = computed((): number => {
    const expDate = DateTime.fromISO(registration.value?.expiryDate).setZone('America/Vancouver')
    const today = DateTime.now().setZone('America/Vancouver')

    return Math.floor(expDate.diff(today, 'days').toObject().days)
  })

  watch([registration, isRegistrationRenewable], () => {
    isEligibleForRenewal.value = (registration.value && isRegistrationRenewable.value)
      ? getRegistrationRenewalStatus(registration.value.id)
      : isEligibleForRenewal.value = false
  })

  // TODO: Remove after QA, registration number 96950160599768
  const isTestRenewalApp = computed((): boolean =>
    process.env.NODE_ENV === 'development' && registration.value?.id === 308)

  return {
    isEligibleForRenewal,
    renewalDueDate,
    renewalDateCounter,
    isTestRenewalApp
  }
}
