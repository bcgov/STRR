/**
 * Draft save/submit identity and renewal draft resume for the host application wizard.
 */
export function useHostApplicationDraft () {
  const route = useRoute()
  const router = useRouter()
  const { applicationId, isRenewal } = useRouterParams()
  const permitStore = useHostPermitStore()
  const {
    application,
    registration,
    isRegistrationRenewal,
    effectiveRegistrationId
  } = storeToRefs(permitStore)

  const draftApplicationId = ref<string | undefined>(undefined)

  const isRegRenewalFlow = computed(
    () => isRenewal.value && !!effectiveRegistrationId.value
  )

  /**
   * Current best application id for save/submit.
   * Prefer the locally persisted draft id, then loaded header id, then query id.
   */
  const effectiveApplicationNumber = computed((): string | undefined =>
    draftApplicationId.value ??
      application.value?.header?.applicationNumber ??
      (applicationId.value || undefined)
  )

  /**
   * Keep URL query in sync with the latest draft id without adding history entries.
   */
  async function syncApplicationIdToQuery (applicationNumber: string) {
    await router.replace({
      path: route.path,
      query: {
        ...route.query,
        applicationId: applicationNumber
      }
    })
  }

  async function persistDraftApplicationId (applicationNumber: string) {
    draftApplicationId.value = applicationNumber
    await syncApplicationIdToQuery(applicationNumber)
    const regId = registration.value?.id ?? effectiveRegistrationId.value
    if (regId) {
      permitStore.persistSelectedRegistrationId(regId)
    }
  }

  async function resumeRenewalDraftFromTodosIfNeeded () {
    const regId = registration.value?.id
    // If query already contains an application id, we are opening a known draft/application path.
    if (!regId || applicationId.value) {
      return
    }

    const { renewalDraftId } = await getTodoRegistration(regId)
    if (!renewalDraftId || typeof renewalDraftId !== 'string') {
      return
    }

    await persistDraftApplicationId(renewalDraftId)
    await permitStore.loadHostData(renewalDraftId, true)
    isRegistrationRenewal.value = true
  }

  /**
   * Load initial renewal/application context from registration flow, query id, or existing application.
   */
  async function loadInitialPermitData () {
    if (isRegRenewalFlow.value) {
      const registrationId = effectiveRegistrationId.value
      if (!registrationId) {
        return
      }
      await permitStore.loadHostRegistrationData(registrationId, true)
      isRegistrationRenewal.value = true
      await resumeRenewalDraftFromTodosIfNeeded()
    } else if (isRenewal.value && applicationId.value) {
      await permitStore.loadHostData(applicationId.value, true)
      isRegistrationRenewal.value = true
    } else if (applicationId.value) {
      await permitStore.loadHostData(applicationId.value, true)
      if (application.value?.header.applicationType === 'renewal') {
        isRegistrationRenewal.value = true
      }
    }
  }

  return {
    draftApplicationId,
    isRegRenewalFlow,
    effectiveApplicationNumber,
    persistDraftApplicationId,
    loadInitialPermitData
  }
}
