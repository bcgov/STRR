import { z } from 'zod'

export const useExaminerStore = defineStore('strr/examiner-store', () => {
  const { getAccountApplications } = useStrrApi()
  const { t } = useI18n()
  const { $strrApi } = useNuxtApp()
  const strrModal = useStrrModals()
  const isFilingHistoryOpen = ref(false) // track state of Filing Histroy between different expansion panels
  const tableLimit = ref(50)
  const tablePage = ref(1)
  const activeRecord = ref<HousApplicationResponse | HousRegistrationResponse | undefined>(undefined)
  const isApplication = computed<boolean>(() => {
    return !!activeRecord.value && 'registration' in activeRecord.value
  })
  const activeReg = computed(() => {
    return isApplication.value
      ? activeRecord.value?.registration
      : activeRecord.value
  })
  const activeHeader = computed(() => {
    return activeRecord.value?.header
  })
  const nocContent = reactive({
    content: ''
  })
  // TODO: Add assigned logic check later
  const showNocModal = computed(() => {
    return activeHeader.value?.status === ApplicationStatus.FULL_REVIEW
  })
  const nocFormRef = ref<Form<any>>()
  const sendNocSchema = computed(() => z.object({
    content: z.string().min(1, { message: t('validation.nocContent') })
  }))
  const defaultApplicationStatuses = [
    ApplicationStatus.FULL_REVIEW,
    ApplicationStatus.PROVISIONAL_REVIEW,
    ApplicationStatus.PAYMENT_DUE,
    ApplicationStatus.PROVISIONAL,
    ApplicationStatus.PAID,
    ApplicationStatus.ADDITIONAL_INFO_REQUESTED,
    ApplicationStatus.PROVISIONALLY_APPROVED,
    ApplicationStatus.DECLINED,
    ApplicationStatus.AUTO_APPROVED,
    ApplicationStatus.FULL_REVIEW_APPROVED,
    ApplicationStatus.NOC_PENDING,
    ApplicationStatus.NOC_EXPIRED
  ]
  const defaultRegistrationStatuses = [
    RegistrationStatus.ACTIVE,
    RegistrationStatus.SUSPENDED,
    RegistrationStatus.CANCELLED,
    RegistrationStatus.EXPIRED
  ]

  const tableFilters = reactive({
    searchText: '',
    registrationNumber: '',
    registrationType: [],
    requirements: [],
    applicantName: '',
    propertyAddress: '',
    status: [], // show all statuses
    submissionDate: { start: null, end: null },
    lastModified: { start: null, end: null },
    adjudicator: ''
  })

  /**
   * Process status filters to separate application and registration statuses
   *
   * @param {any[]} statusFilters - Array of status values to filter by
   * @returns {Object} Object containing separated application and registration statuses
   */
  const processStatusFilters = (statusFilters: any[]) => {
    const regStatus: any[] = []
    // Separate application and registration statuses
    const statusValue = statusFilters.filter((status) => {
      if (Object.values(RegistrationStatus).includes(status as any)) {
        regStatus.push(status)
        return false
      }
      return true
    })
    // Start with default statuses list and these will be
    // provided if not status selected in filter
    let applicationStatuses = defaultApplicationStatuses
    let registrationStatuses = defaultRegistrationStatuses
    if (statusValue.length > 0 && regStatus.length === 0) {
      // Only application statuses selected
      applicationStatuses = statusValue
      registrationStatuses = []
    } else if (statusValue.length === 0 && regStatus.length > 0) {
      // Only registration statuses selected
      applicationStatuses = []
      registrationStatuses = regStatus
    } else if (statusValue.length > 0 && regStatus.length > 0) {
      // Both application and registration statuses selected
      applicationStatuses = statusValue
      registrationStatuses = regStatus
    }
    return { applicationStatuses, registrationStatuses }
  }

  const fetchApplications = () => {
    const { applicationStatuses, registrationStatuses } = processStatusFilters(tableFilters.status)
    if (tableFilters.searchText && tableFilters.searchText.length > 2) {
      return $strrApi('/applications/search', {
        query: {
          limit: tableLimit.value,
          page: tablePage.value,
          registrationType: tableFilters.registrationType,
          status: applicationStatuses,
          registrationStatus: registrationStatuses,
          text: tableFilters.searchText,
          sortBy: ApplicationSortBy.APPLICATION_DATE,
          sortOrder: ApplicationSortOrder.ASC,
          address: tableFilters.propertyAddress,
          recordNumber: tableFilters.registrationNumber,
          assignee: tableFilters.adjudicator,
          requirement: tableFilters.requirements
        }
      })
    } else {
      return $strrApi('/applications', {
        query: {
          limit: tableLimit.value,
          page: tablePage.value,
          registrationType: tableFilters.registrationType,
          status: applicationStatuses,
          registrationStatus: registrationStatuses,
          sortBy: ApplicationSortBy.APPLICATION_DATE,
          sortOrder: ApplicationSortOrder.ASC,
          address: tableFilters.propertyAddress,
          recordNumber: tableFilters.registrationNumber,
          assignee: tableFilters.adjudicator,
          requirement: tableFilters.requirements,
          includeDraft: false
        }
      })
    }
  }

  const getNextApplication = async <T extends ApiApplicationBaseResp>(): Promise<T | undefined> => {
    // TODO: update when requirements are flushed out and backend is updated.
    const resp = await getAccountApplications<T>(
      undefined, undefined, ApplicationType.HOST, ApplicationStatus.FULL_REVIEW,
      ApplicationSortBy.APPLICATION_DATE, ApplicationSortOrder.ASC
    )
    const nextApplication = resp.applications[0]
    activeRecord.value = nextApplication
    return nextApplication
  }

  const approveApplication = async (applicationNumber: string): Promise<void> => {
    await $strrApi(`/applications/${applicationNumber}/status`, {
      method: 'PUT',
      body: { status: ApplicationStatus.FULL_REVIEW_APPROVED }
    })
  }

  const viewReceipt = async (applicationNumber: string) => {
    try {
      const resp = await $strrApi<Blob>(`/applications/${applicationNumber}/payment/receipt`, {
        method: 'GET',
        responseType: 'blob'
      })
      const blob = new Blob([resp], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      URL.revokeObjectURL(url)
    } catch (e) {
      logFetchError(e, t('error.downloadReceipt.description'))
      strrModal.openErrorModal('Error', t('error.downloadReceipt.description'), false)
    }
  }

  const rejectApplication = async (applicationNumber: string): Promise<void> => {
    await $strrApi(`/applications/${applicationNumber}/status`, {
      method: 'PUT',
      body: { status: ApplicationStatus.DECLINED }
    })
  }

  const getApplicationById = async (applicationNumber: string): Promise<HousApplicationResponse> => {
    const resp = await $strrApi<HousApplicationResponse>(`/applications/${applicationNumber}`, {
      method: 'GET'
    })
    activeRecord.value = resp
    return resp
  }

  /**
   * Send a Notice of Consideration for the specified application.
   *
   * @param {string} applicationNumber - The application number.
   * @param {string} content - The content of the Notice of Consideration.
   * @returns {Promise<void>}
   */
  const sendNoticeOfConsideration = async (applicationNumber: string, content: string): Promise<void> => {
    await $strrApi(`/applications/${applicationNumber}/notice-of-consideration`, {
      method: 'POST',
      body: { content }
    })
  }

  /**
   * Get/Download Supporting Document file for the Application.
   *
   * @param {string} applicationNumber - The application number to which the document belongs.
   * @param {string} fileKey - The key of the document to be retrieved.
   * @returns The file/document
   */
  const getDocument = async (applicationNumber: string, fileKey: string): Promise<Blob> => {
    return await $strrApi(`/applications/${applicationNumber}/documents/${fileKey}`, {
      method: 'GET',
      responseType: 'blob'
    })
  }

  /**
   * Assign the current user as the reviewer of an application.
   *
   * @param {string} applicationNumber - The application number to assign.
   */
  const assignApplication = async (applicationNumber: string): Promise<void> => {
    try {
      await $strrApi(`/applications/${applicationNumber}/assign`, {
        method: 'PUT'
      })
    } catch (e) {
      logFetchError(e, t('error.assignApplication'))
      strrModal.openErrorModal('Error', t('error.assignApplication'), false)
    }
  }

  /**
   * Unassign the reviewer from an application.
   *
   * @param {string} applicationNumber - The application number to unassign.
   */
  const unassignApplication = async (applicationNumber: string): Promise<void> => {
    try {
      await $strrApi(`/applications/${applicationNumber}/unassign`, {
        method: 'PUT'
      })
    } catch (e) {
      logFetchError(e, t('error.unAssignApplication'))
      strrModal.openErrorModal('Error', t('error.unAssignApplication'), false)
    }
  }

  /**
   * Update the status of a registration.
   *
   * @param {number} registrationId - The registrationId for the registration to be updated.
   * @param {string} status - RegistrationStatus value (SUSPENDED or CANCELLED).
   */
  const updateRegistrationStatus = async (registrationId: number, status: RegistrationStatus): Promise<void> => {
    await $strrApi(`/registrations/${registrationId}/status`, {
      method: 'PUT',
      body: { status }
    })
  }

  /**
   * Get a registration by registrationId.
   *
   * @param {number} registrationId - The registrationId for the registration.
   */
  const getRegistrationById = async (registrationId: string): Promise<HousRegistrationResponse> => {
    const resp = await $strrApi<HousRegistrationResponse>(`/registrations/${registrationId}`, {
      method: 'GET'
    })
    activeRecord.value = resp
    return resp
  }

  const getApplicationFilingHistory = async (applicationNumber: string): Promise<FilingHistoryEvent[]> => {
    try {
      return await $strrApi<FilingHistoryEvent[]>(`/applications/${applicationNumber}/events`, {
        method: 'GET'
      })
    } catch (e) {
      logFetchError(e, t('error.filingHistory'))
      return []
    }
  }

  const getRegistrationFilingHistory = async (registrationId: number): Promise<FilingHistoryEvent[]> => {
    try {
      return await $strrApi<FilingHistoryEvent[]>(`/registrations/${registrationId}/events`, {
        method: 'GET'
      })
    } catch (e) {
      logFetchError(e, t('error.filingHistory'))
      return []
    }
  }

  const openDocInNewTab = async (applicationNumber: string, supportingDocument: ApiDocument) => {
    const file = await getDocument(applicationNumber, supportingDocument.fileKey)
    const blob = new Blob([file], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    URL.revokeObjectURL(url)
  }

  const resetFilters = () => {
    Object.assign(
      tableFilters,
      {
        searchText: '',
        registrationNumber: '',
        registrationType: [],
        requirements: [],
        applicantName: '',
        propertyAddress: '',
        status: [],
        submissionDate: { start: null, end: null },
        lastModified: { start: null, end: null },
        adjudicator: ''
      }
    )
  }

  return {
    tableFilters,
    tableLimit,
    tablePage,
    isApplication,
    activeRecord,
    activeReg,
    activeHeader,
    sendNocSchema,
    nocContent,
    nocFormRef,
    showNocModal,
    viewReceipt,
    approveApplication,
    rejectApplication,
    sendNoticeOfConsideration,
    fetchApplications,
    getNextApplication,
    getApplicationById,
    getDocument,
    openDocInNewTab,
    resetFilters,
    updateRegistrationStatus,
    getRegistrationById,
    assignApplication,
    unassignApplication,
    getApplicationFilingHistory,
    getRegistrationFilingHistory,
    isFilingHistoryOpen
  }
}, { persist: true }) // will persist data in session storage
