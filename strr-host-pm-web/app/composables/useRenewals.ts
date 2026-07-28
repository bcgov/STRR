import { DateTime } from 'luxon'

// Registration Renewals composable
export const useRenewals = () => {
  const permitStore = useHostPermitStore()
  const localePath = useLocalePath()
  const { isRenewalsEnabled } = useHostFeatureFlags()

  const registration = toRef(permitStore, 'registration')

  const isEligibleForRenewal = ref(false)
  const hasRegistrationRenewalDraft = ref(false)
  const hasRegistrationRenewalPaymentPending = ref(false)
  const renewalDraftId = ref('')
  const renewalPaymentPendingId = ref('')

  /** Checks if 3 years past since expiry date and renewal is closed for a registration. */
  const checkIsRenewalPeriodClosed = (
    reg: Partial<RegistrationRecord> | ApiRegistrationResp | HostRegistrationResp | null | undefined
  ): boolean => {
    if (!reg?.expiryDate) {
      return false
    }
    const isRegExpired = reg.status === RegistrationStatus.EXPIRED
    const expDate = DateTime.fromISO(reg.expiryDate).setZone('America/Vancouver')
    if (!expDate.isValid) {
      return false
    }
    const today = DateTime.now().setZone('America/Vancouver')
    return today.diff(expDate, 'years').years > 3 && isRegExpired
  }

  // check if 3 years past since expiry date and renewal is closed
  const isRenewalPeriodClosed = computed((): boolean => {
    return checkIsRenewalPeriodClosed(registration.value)
  })

  // converts expiry date to medium format date, eg Apr 1, 2025
  const renewalDueDate = computed((): string => {
    const expiryDate = registration.value?.expiryDate
    if (!expiryDate) {
      return ''
    }
    const dt = DateTime.fromISO(expiryDate)
    return dt.isValid ? dt.toLocaleString(DateTime.DATE_MED) : ''
  })

  // number of days for renewal due date
  const renewalDateCounter = computed((): number => {
    const expiryDate = registration.value?.expiryDate
    if (!expiryDate) {
      return 0
    }
    const expDate = DateTime.fromISO(expiryDate).setZone('America/Vancouver')
    if (!expDate.isValid) {
      return 0
    }
    const today = DateTime.now().setZone('America/Vancouver')
    const days = expDate.diff(today, 'days').days
    return days !== undefined && !Number.isNaN(days) ? Math.floor(days) : 0
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

  /** Starts a new renewal flow for the specified registration ID. */
  const startRenewal = async (registrationId: string | number) => {
    if (typeof permitStore.setRenewalRegistrationContext === 'function') {
      permitStore.setRenewalRegistrationContext(registrationId)
    } else {
      (permitStore as unknown as { renewalRegId?: string }).renewalRegId = registrationId?.toString()
    }
    await navigateTo({
      path: localePath('/application'),
      query: { renew: 'true' }
    })
  }

  /** Opens the existing renewal draft for the specified application ID. */
  const resumeRenewalDraft = async (draftApplicationId: string) => {
    if (!draftApplicationId) {
      return
    }
    if (typeof permitStore.clearRenewalRegistrationContext === 'function') {
      permitStore.clearRenewalRegistrationContext()
    } else {
      (permitStore as unknown as { renewalRegId?: string }).renewalRegId = undefined
    }
    await navigateTo({
      path: localePath('/application'),
      query: {
        renew: 'true',
        applicationId: draftApplicationId
      }
    })
  }

  /** Determines whether the Renew action should be shown for a registration record. */
  const canRenewRegistration = (
    reg: Partial<RegistrationRecordWithTodos> | RegistrationRecordWithTodos | RegistrationRecord | null | undefined,
    expiryState?: ExpiryState,
    renewalDraftExists?: boolean,
    renewalPaymentPending?: boolean
  ): boolean => {
    const renewalsEnabled = isRenewalsEnabled?.value ?? false
    if (!renewalsEnabled || !reg) {
      return false
    }

    if ('hasRenewalTodo' in reg && reg.hasRenewalTodo !== undefined) {
      return reg.hasRenewalTodo && !checkIsRenewalPeriodClosed(reg)
    }

    const isClosed = checkIsRenewalPeriodClosed(reg)
    const isEligibleByExpiry = [ExpiryState.EXPIRED, ExpiryState.EXPIRING_SOON].includes(expiryState as ExpiryState)

    return isEligibleByExpiry &&
      !renewalDraftExists &&
      !renewalPaymentPending &&
      !isClosed
  }

  /** Fetches renewal todo details for a list of registrations in parallel. */
  const fetchRegistrationsWithRenewalTodos = async <T extends { id: number }>(
    registrations: T[]
  ): Promise<(T & RenewalTodoDetails)[]> => {
    if (!registrations?.length) {
      return []
    }
    return await Promise.all(
      registrations.map(async (reg): Promise<T & RenewalTodoDetails> => {
        try {
          const todoInfo = await getTodoRegistration(reg.id)
          return {
            ...reg,
            hasRenewalTodo: todoInfo.hasRenewalTodo,
            hasRenewalDraft: todoInfo.hasRenewalDraft,
            hasRenewalPaymentPending: todoInfo.hasRenewalPaymentPending,
            renewalDraftId: todoInfo.renewalDraftId,
            renewalPaymentPendingId: todoInfo.renewalPaymentPendingId
          } as T & RenewalTodoDetails
        } catch {
          return {
            ...reg,
            hasRenewalTodo: false,
            hasRenewalDraft: false,
            hasRenewalPaymentPending: false,
            renewalDraftId: null,
            renewalPaymentPendingId: null
          } as T & RenewalTodoDetails
        }
      })
    )
  }

  return {
    isEligibleForRenewal,
    hasRegistrationRenewalDraft,
    hasRegistrationRenewalPaymentPending,
    renewalDraftId,
    renewalPaymentPendingId,
    isRenewalPeriodClosed,
    renewalDueDate,
    renewalDateCounter,
    getRegistrationRenewalTodos,
    startRenewal,
    resumeRenewalDraft,
    canRenewRegistration,
    fetchRegistrationsWithRenewalTodos
  }
}
