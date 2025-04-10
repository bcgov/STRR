import { DateTime } from 'luxon'

// Registration Renewals composable
export const useRenewals = () => {
  const { getRegistrationToDos } = useStrrApi()
  const { registration } = storeToRefs(useHostPermitStore())

  const isEligibleForRenewal = ref(false)

  // check if 3 years past since exipry date and renewal is closed
  const isRenewalPeriodClosed = computed((): boolean => {
    const isRegExpired = registration.value?.status === RegistrationStatus.EXPIRED
    const expDate = DateTime.fromISO(registration.value?.expiryDate).setZone('America/Vancouver')
    const today = DateTime.now().setZone('America/Vancouver')
    return today.diff(expDate, 'years').years > 3 && isRegExpired
  })

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

  watch(registration, async () => {
    if (!registration.value) {
      isEligibleForRenewal.value = false
      return
    }
    const { todos } = await getRegistrationToDos(registration.value.id)
    // check if todos have a renewable registration
    isEligibleForRenewal.value = todos.some(todo => todo?.task?.type === RegistrationTodoType.REGISTRATION_RENEWAL)
  })

  // TODO: Remove after testing, registration number H192452838, id 308
  const isTestRenewalReg = computed((): boolean =>
    process.env.NODE_ENV === 'development' && registration.value?.id === 308)

  return {
    isEligibleForRenewal,
    isRenewalPeriodClosed,
    renewalDueDate,
    renewalDateCounter,
    isTestRenewalReg
  }
}
