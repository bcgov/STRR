import { z } from 'zod'

export const useExaminerStore = defineStore('strr/examiner-store', () => {
  const { getAccountApplications } = useStrrApi()
  const { t } = useI18n()
  const { $strrApi } = useNuxtApp()
  const strrModal = useStrrModals()

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
  const showNocModal = ref(true)
  const nocFormRef = ref<Form<any>>()
  const sendNocSchema = computed(() => z.object({
    content: z.string().min(1, { message: t('validation.nocContent') })
  }))

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
    adjudicator: []
  })

  const fetchApplications = () => {
    let statusValue = Array.isArray(tableFilters.status)
      ? tableFilters.status[0]
      : tableFilters.status
    let regStatus
    if (Object.values(RegistrationStatus).includes(statusValue as any)) {
      regStatus = statusValue
      statusValue = undefined
    }
    if (tableFilters.registrationType.length) { // fetch applications by type if type provided
      return $strrApi('/applications', {
        query: {
          limit: tableLimit.value,
          page: tablePage.value,
          registrationType: tableFilters.registrationType[0], // api only allows 1 at a time
          status: statusValue, // api only allows 1 at a time
          registrationStatus: regStatus,
          sortBy: ApplicationSortBy.APPLICATION_DATE,
          sortOrder: ApplicationSortOrder.ASC,
          address: tableFilters.propertyAddress,
          recordNumber: tableFilters.registrationNumber
        }
      })
    } else { // else try to fetch by search
      return $strrApi('/applications/search', {
        query: {
          limit: tableLimit.value,
          page: tablePage.value,
          status: statusValue, // api only allows 1 at a time
          registrationStatus: regStatus,
          text: tableFilters.searchText.length > 2 ? tableFilters.searchText : undefined, // min length 3 required
          sortBy: ApplicationSortBy.APPLICATION_DATE,
          sortOrder: ApplicationSortOrder.ASC,
          address: tableFilters.propertyAddress,
          recordNumber: tableFilters.registrationNumber
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

  const downloadReceipt = async (applicationNumber: string) => {
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
        adjudicator: []
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
    downloadReceipt,
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
    getRegistrationById
  }
}, { persist: true }) // will persist data in session storage
