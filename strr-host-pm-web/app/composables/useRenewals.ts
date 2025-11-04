import { DateTime } from 'luxon'

// Registration Renewals composable
export const useRenewals = () => {
  const { getRegistrationToDos } = useStrrApi()
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

    const { todos } = await getRegistrationToDos(registration.value.id)
    // check if todos have a renewable registration
    isEligibleForRenewal.value = todos.some(todo => todo?.task?.type === RegistrationTodoType.REGISTRATION_RENEWAL)
    // check if todos have a renewable registration draft
    hasRegistrationRenewalDraft.value =
      todos.some(todo => todo?.task?.type === RegistrationTodoType.REGISTRATION_RENEWAL_DRAFT)
    // check if todos have a payment pending renewal
    hasRegistrationRenewalPaymentPending.value =
      todos.some(todo => todo?.task?.type === RegistrationTodoType.REGISTRATION_RENEWAL_PAYMENT_PENDING)

    if (hasRegistrationRenewalDraft.value) {
      renewalDraftId.value = todos
        .find(todo => todo?.task?.type === RegistrationTodoType.REGISTRATION_RENEWAL_DRAFT).task.detail
    }

    if (hasRegistrationRenewalPaymentPending.value) {
      renewalPaymentPendingId.value = todos
        .find(todo => todo?.task?.type === RegistrationTodoType.REGISTRATION_RENEWAL_PAYMENT_PENDING).task.detail
    }
  }

  watch(registration, async () => {
    await getRegistrationRenewalTodos()
  })

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
