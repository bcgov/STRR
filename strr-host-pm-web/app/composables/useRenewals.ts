import { DateTime } from 'luxon'

// Registration Renewals composable
export const useRenewals = () => {
  const { getRegistrationsToDos } = useStrrApi()
  const { registration } = storeToRefs(useHostPermitStore())

  const isEligibleForRenewal = ref(false)

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
    const { todos } = await getRegistrationsToDos(registration.value.id)
    // check if todos have a renewable registration
    isEligibleForRenewal.value = todos.some(todo => todo?.task?.type === RegistrationTodoType.REGISTRATION_RENEWAL)
  })

  // TODO: Remove after testing, registration number H192452838, id 308
  const isTestRenewalReg = computed((): boolean =>
    process.env.NODE_ENV === 'development' && registration.value?.id === 308)

  return {
    isEligibleForRenewal,
    renewalDueDate,
    renewalDateCounter,
    isTestRenewalReg
  }
}
