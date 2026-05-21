import { DateTime } from 'luxon'

// Registration Renewals composable
export const useRenewals = () => {
  const { registration } = storeToRefs(useHostPermitStore())

  const isEligibleForRenewal = ref(false)
  const hasRegistrationRenewalDraft = ref(false)
  const hasRegistrationRenewalPaymentPending = ref(false)
  const renewalDraftId = ref('')
  const renewalPaymentPendingId = ref('')

  // check if 3 years past since expiry date and renewal is closed
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

  const getRegistrationRenewalTodos = async () => {
    if (!registration.value) {
      isEligibleForRenewal.value = false
      hasRegistrationRenewalDraft.value = false
      hasRegistrationRenewalPaymentPending.value = false
      return
    }

    const {
      hasRenewalTodo,
      hasRenewalDraft,
      hasRenewalPaymentPending,
      renewalDraftId: draftId,
      renewalPaymentPendingId: paymentPendingId
    } = await getTodoRegistration(registration.value.id)

    isEligibleForRenewal.value = hasRenewalTodo
    hasRegistrationRenewalDraft.value = hasRenewalDraft
    hasRegistrationRenewalPaymentPending.value = hasRenewalPaymentPending
    renewalDraftId.value = draftId ?? ''
    renewalPaymentPendingId.value = paymentPendingId ?? ''
  }

  watch(registration, async () => {
    await getRegistrationRenewalTodos()
  }, { immediate: true })

  return {
    isEligibleForRenewal,
    hasRegistrationRenewalDraft,
    hasRegistrationRenewalPaymentPending,
    renewalDraftId,
    renewalPaymentPendingId,
    isRenewalPeriodClosed,
    renewalDueDate,
    renewalDateCounter,
    getRegistrationRenewalTodos
  }
}
