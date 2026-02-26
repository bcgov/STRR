import { z } from 'zod'

export const useExaminerStore = defineStore('strr/examiner-store', () => {
  const { getAccountApplications } = useStrrApi()
  const { t } = useNuxtApp().$i18n
  const { $strrApi } = useNuxtApp()
  const { isSplitDashboardTableEnabled } = useExaminerFeatureFlags()
  const strrModal = useStrrModals()
  const { kcUser } = useKeycloak()
  const isFilingHistoryOpen = ref(false) // track state of Filing History between different expansion panels
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
    const currentRecordHeader = activeRecord.value?.header
    if (!isApplication.value) {
      const applicationHeader = currentRecordHeader?.applications?.[0]
      if (applicationHeader && currentRecordHeader) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { applications, ...rest } = currentRecordHeader
        return { ...applicationHeader, ...rest }
      }
    }
    return currentRecordHeader
  })
  const _isAssignedToUser = ref(false)

  const snapshotInfo = ref<ApiSnapshot>({} as ApiSnapshot)

  watch(
    () => [
      activeHeader.value?.assignee?.username
    ],
    ([reviewerUsername]) => {
      try {
        const currentUser = kcUser.value.userName
        _isAssignedToUser.value = reviewerUsername === currentUser
      } catch (e) {
        _isAssignedToUser.value = false
      }
    },
    { immediate: true }
  )
  const isAssignedToUser = computed(() => _isAssignedToUser.value)
  const emailContent = reactive({
    content: ''
  })

  // Examiner decisions
  const conditions = ref<string[]>([])
  const customConditions = ref<string[] | null>(null)
  const minBookingDays = ref<number | null>(null)
  const decisionEmailContent = reactive({ content: '' })

  const isEditingRentalUnit = ref(false)
  const hasUnsavedRentalUnitChanges = ref(false)
  const rentalUnitAddressToEdit = ref<Partial<EditStrAddress>>({})
  const rentalUnitAddressSchema = computed(() => z.object({
    addressLineTwo: z.string().optional().default(''),
    city: z.string().min(1, t('validation.address.city')),
    province: z.string().min(1, t('validation.address.region')),
    postalCode: z.string().min(1, t('validation.address.postalCode')),
    locationDescription: z.string().optional().default(''),
    streetName: z.string().optional().default(''),
    streetNumber: z.string().optional().default(''),
    unitNumber: z.string().optional().default('')
  }).superRefine((data, ctx) => {
    if (data.addressLineTwo === '') {
      if (!data.streetName) {
        ctx.addIssue({
          code: 'custom',
          path: ['streetName'],
          message: t('validation.address.streetName')
        })
      }
      if (!data.streetNumber) {
        ctx.addIssue({
          code: 'custom',
          path: ['streetNumber'],
          message: t('validation.address.streetNumber')
        })
      }
    }
  }))
  const startEditRentalUnitAddress = () => {
    const addressData = JSON.parse(JSON.stringify(activeReg.value?.unitAddress || {}))
    if (addressData.locationDescription === null) {
      addressData.locationDescription = ''
    }
    rentalUnitAddressToEdit.value = addressData
    isEditingRentalUnit.value = true
    hasUnsavedRentalUnitChanges.value = false // Reset unsaved changes flag
  }
  const resetEditRentalUnitAddress = () => {
    isEditingRentalUnit.value = false
    rentalUnitAddressToEdit.value = {}
    hasUnsavedRentalUnitChanges.value = false
  }

  const showComposeNocEmail = computed(() => {
    return activeHeader.value?.status === ApplicationStatus.FULL_REVIEW ||
      activeHeader.value?.status === ApplicationStatus.PROVISIONAL_REVIEW
  })
  const sendNocSchema = computed(() => z.object({
    content: z.string().min(1, { message: t('validation.nocContent') })
  }))

  const emailFormRef = ref<Form<any>>()
  const decisionEmailFormRef = ref<Form<any>>()
  const showComposeEmail = computed(() => {
    return activeHeader.value?.status === ApplicationStatus.NOC_PENDING ||
      activeHeader.value?.status === ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING ||
      activeHeader.value?.status === ApplicationStatus.PROVISIONAL_REVIEW_NOC_EXPIRED ||
       (activeReg.value?.status === RegistrationStatus.ACTIVE && // show compose email for active Reg with suspend action btn
        activeReg.value.header.examinerActions.includes(RegistrationActionsE.SUSPEND)) ||
       (activeReg.value?.status === RegistrationStatus.ACTIVE && // show compose email for active Reg with cancel action btn
        activeReg.value.header.examinerActions.includes(RegistrationActionsE.CANCEL)) ||
       (activeReg.value?.status === RegistrationStatus.ACTIVE && // show compose email for active Reg with send NOC action btn
        activeReg.value.header.examinerActions.includes(RegistrationActionsE.SEND_NOC))
  })
  const sendEmailSchema = computed(() => z.object({
    content: z.string()
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
    ApplicationStatus.NOC_EXPIRED,
    ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING,
    ApplicationStatus.PROVISIONAL_REVIEW_NOC_EXPIRED,
    ApplicationStatus.PROVISIONALLY_DECLINED
  ]
  const defaultRegistrationStatuses = [
    RegistrationStatus.ACTIVE,
    RegistrationStatus.SUSPENDED,
    RegistrationStatus.CANCELLED,
    RegistrationStatus.EXPIRED
  ]

  const applicationsOnlyStatuses = [
    ApplicationStatus.FULL_REVIEW,
    ApplicationStatus.NOC_EXPIRED
  ]

  // as per requirements, registrations statuses in filter dropdown
  // should reflect their respective application's statuses
  const registrationsOnlyStatuses = [
    ApplicationStatus.PROVISIONALLY_APPROVED,
    ApplicationStatus.NOC_EXPIRED
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
    localGov: '',
    adjudicator: ''
  })

  // approval method statuses to show how registration was approved (via its application status)
  const approvalMethodStatuses = new Set([
    ApplicationStatus.PROVISIONALLY_APPROVED,
    ApplicationStatus.FULL_REVIEW_APPROVED,
    ApplicationStatus.AUTO_APPROVED
  ])
  // attributes of the registration
  const NOC_ATTR = new Set(['NOC_PENDING', 'NOC_EXPIRED'])
  const SET_ASIDE_ATTR = 'SET_ASIDE'

  /**
   * Process status filters to separate application statuses, registration statuses,
   * approval methods, NOC statuses, and set-aside flag.
   *
   * @param {any[]} statusFilters - Array of status values to filter by
   * @returns {Object} Object containing separated filter categories
   */
  const processStatusFilters = (statusFilters: any[]) => {
    const regStatus: any[] = []
    const approvalMethods: any[] = []
    const nocStatuses: any[] = []
    let isSetAside: boolean | undefined

    // Separate application and registration statuses, excluding UI grouping labels
    const statusValue = statusFilters.filter((status) => {
      if (Object.values(RegistrationStatus).includes(status as any)) {
        regStatus.push(status)
        return false
      }
      if (approvalMethodStatuses.has(status)) {
        approvalMethods.push(status)
        return false
      }
      if (NOC_ATTR.has(status)) {
        nocStatuses.push(status)
        return false
      }
      if (status === SET_ASIDE_ATTR) {
        isSetAside = true
        return false
      }
      // filter out any statuses that are not in ApplicationStatus (for grouping labels)
      return Object.values(ApplicationStatus).includes(status as any)
    })
    // use defaults only when nothing at all is selected
    const anyFilterSelected =
      statusValue.length > 0 || regStatus.length > 0 ||
      approvalMethods.length > 0 || nocStatuses.length > 0 || isSetAside !== undefined
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
    } else if (anyFilterSelected) {
      // only approval methods / NOC statuses / set-aside selected — no explicit status filter
      applicationStatuses = []
      registrationStatuses = []
    }
    return { applicationStatuses, registrationStatuses, approvalMethods, nocStatuses, isSetAside }
  }

  const fetchApplications = () => {
    const { applicationStatuses, registrationStatuses } = processStatusFilters(tableFilters.status)
    const applicationsOnly = isSplitDashboardTableEnabled.value
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
          includeDraftRegistration: false,
          applicationsOnly
        }
      })
    }
  }

  const fetchRegistrations = () => {
    const { registrationStatuses, approvalMethods, nocStatuses, isSetAside } = processStatusFilters(tableFilters.status)

    const queryParams: Record<string, any> = {
      sortOrder: 'asc',
      limit: tableLimit.value,
      page: tablePage.value,
      registrationType: tableFilters.registrationType,
      status: registrationStatuses,
      requirement: tableFilters.requirements,
      recordNumber: tableFilters.registrationNumber,
      text: undefined as string | undefined
    }

    if (approvalMethods.length > 0) {
      queryParams.approvalMethod = approvalMethods
    }
    if (nocStatuses.length > 0) {
      queryParams.nocStatus = nocStatuses
    }
    if (isSetAside) {
      queryParams.isSetAside = true
    }

    if (tableFilters.searchText && tableFilters.searchText.length > 2) {
      queryParams.text = tableFilters.searchText
    }

    return $strrApi('/registrations/search', {
      query: queryParams
    })
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

  const provisionallyApproveApplication = async (applicationNumber: string): Promise<void> => {
    await $strrApi(`/applications/${applicationNumber}/status`, {
      method: 'PUT',
      body: { status: ApplicationStatus.PROVISIONALLY_APPROVED }
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

  const rejectApplication = async (
    applicationNumber: string,
    isProvisional: boolean = false,
    content?: string
  ): Promise<void> => {
    await $strrApi(`/applications/${applicationNumber}/status`, {
      method: 'PUT',
      body: {
        status: isProvisional ? ApplicationStatus.PROVISIONALLY_DECLINED : ApplicationStatus.DECLINED,
        emailContent: content
      }
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
   * Send a Notice of Consideration for the specified registration.
   *
   * @param {number} registrationId - The registration ID.
   * @param {string} content - The content of the Notice of Consideration.
   * @returns {Promise<void>}
   */
  const sendNoticeOfConsiderationForRegistration = async (registrationId: number, content: string): Promise<void> => {
    await $strrApi(`/registrations/${registrationId}/notice-of-consideration`, {
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
  const getDocument = async (
    appRegNumber: string | number,
    fileKey: string,
    type: 'applications' | 'registrations'
  ): Promise<Blob> => {
    return await $strrApi(`/${type}/${appRegNumber}/documents/${fileKey}`, {
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
   * Assign the current user as the reviewer of a registration.
   *
   * @param {number} registrationId - The registration ID to assign.
   */
  const assignRegistration = async (registrationId: number): Promise<void> => {
    try {
      await $strrApi(`/registrations/${registrationId}/assign`, {
        method: 'PUT'
      })
    } catch (e) {
      logFetchError(e, t('error.assignApplication'))
      strrModal.openErrorModal('Error', t('error.assignApplication'), false)
    }
  }

  /**
   * Unassign the reviewer from a registration.
   *
   * @param {number} registrationId - The registration ID to unassign.
   */
  const unassignRegistration = async (registrationId: number): Promise<void> => {
    try {
      await $strrApi(`/registrations/${registrationId}/unassign`, {
        method: 'PUT'
      })
    } catch (e) {
      logFetchError(e, t('error.unAssignApplication'))
      strrModal.openErrorModal('Error', t('error.unAssignApplication'), false)
    }
  }

  /**
   * Set aside application decision.
   *
   * @param {string} applicationNumber - The application number to set aside.
   */
  const setAsideApplication = async (applicationNumber: string): Promise<void> => {
    try {
      await $strrApi(`/applications/${applicationNumber}/decision/set-aside`, {
        method: 'POST',
        body: {}
      })
    } catch (e) {
      logFetchError(e, t('error.setAsideApplication'))
      strrModal.openErrorModal('Error', t('error.setAsideApplication'), false)
    }
  }

  /**
   * Set aside registration.
   *
   * @param {number} registrationId - The registration id to set aside.
   */
  const setAsideRegistration = async (registrationId: number): Promise<void> => {
    try {
      await $strrApi(`/registrations/${registrationId}/decision/set-aside`, {
        method: 'POST',
        body: {}
      })
    } catch (e) {
      logFetchError(e, t('error.setAsideRegistration'))
      strrModal.openErrorModal('Error', t('error.setAsideRegistration'), false)
    }
  }

  /**
   * Update the status of a registration.
   *
   * @param {number} registrationId - The registrationId for the registration to be updated.
   * @param {string} status - RegistrationStatus value (ACTIVE [reinstate], SUSPENDED or CANCELLED).
   */
  const updateRegistrationStatus = async (
    registrationId: number,
    status: RegistrationStatus,
    content?: string,
    conditionsOfApproval?: ConditionsOfApproval
  ): Promise<void> => {
    await $strrApi(`/registrations/${registrationId}/status`, {
      method: 'PUT',
      body: {
        status,
        ...(content && { emailContent: content }),
        conditionsOfApproval
      }
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

  /**
   * Get a snapshot by registrationId and snapshotId.
   *
   * @param {string} registrationId - The registrationId for the registration
   * @param {string} snapshotId - The snapshotId for the snapshot
   */
  const getSnapshotById = async (
    registrationId: string,
    snapshotId: string
  ): Promise<any> => {
    return await $strrApi<any>(
      `/registrations/${registrationId}/snapshots/${snapshotId}`,
      { method: 'GET' }
    )
  }

  const openDocInNewTab = async (
    appRegNumber: string | number,
    supportingDocument: ApiDocument,
    type: 'applications' | 'registrations'
  ) => {
    const file = await getDocument(appRegNumber, supportingDocument.fileKey, type)
    const blob = new Blob([file], { type: supportingDocument.fileType })
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
        localGov: '',
        adjudicator: ''
      }
    )
  }

  /** Reset to the applications table default state (default status filters, other filters clear). */
  const resetFiltersToApplicationsDefault = () => {
    Object.assign(tableFilters, {
      searchText: '',
      registrationNumber: '',
      registrationType: [],
      requirements: [],
      applicantName: '',
      propertyAddress: '',
      status: [...applicationsOnlyStatuses],
      submissionDate: { start: null, end: null },
      lastModified: { start: null, end: null },
      localGov: '',
      adjudicator: ''
    })
    tablePage.value = 1
  }

  /** Reset to the registrations table default state (Provisionally Approved + NOC Expired). */
  const resetFiltersToRegistrationsDefault = () => {
    Object.assign(tableFilters, {
      searchText: '',
      registrationNumber: '',
      registrationType: [],
      requirements: [],
      applicantName: '',
      propertyAddress: '',
      status: [...registrationsOnlyStatuses],
      submissionDate: { start: null, end: null },
      lastModified: { start: null, end: null },
      localGov: '',
      adjudicator: ''
    })
    tablePage.value = 1
  }

  /**
   * Saves the updated rental unit address for either an application or registration.
   *
   * @param {Partial<EditStrAddress>} updatedAddress - The new address data to save
   * @param {string|number} identifier - The ID of the application or registration
   * @param {boolean} isApplication - Flag indicating if this is an application (true) or registration (false)
   * @returns {Promise<void>}
   */
  const saveRentalUnitAddress = async (
    updatedAddress: Partial<EditStrAddress>,
    identifier: string | number,
    isApplication: boolean
  ): Promise<void> => {
    try {
      const endpoint = isApplication
        ? `/applications/${identifier}/str-address`
        : `/registrations/${identifier}/str-address`
      const resp = await $strrApi(endpoint, {
        method: 'PATCH',
        body: {
          unitAddress: updatedAddress
        }
      })
      activeRecord.value = resp
      resetEditRentalUnitAddress()
    } catch (e) {
      logFetchError(e, t('error.saveAddress'))
      strrModal.openErrorModal('Error', t('error.saveAddress'), false)
    }
  }

  return {
    tableFilters,
    tableLimit,
    tablePage,
    isApplication,
    activeRecord,
    activeReg,
    activeHeader,
    isAssignedToUser,
    sendNocSchema,
    emailContent,
    snapshotInfo,

    // examiner approval conditions
    conditions,
    customConditions,
    minBookingDays,
    decisionEmailContent,

    emailFormRef,
    decisionEmailFormRef,
    sendEmailSchema,
    showComposeEmail,
    showComposeNocEmail,
    isFilingHistoryOpen,
    isEditingRentalUnit,
    rentalUnitAddressToEdit,
    hasUnsavedRentalUnitChanges,

    applicationsOnlyStatuses,
    registrationsOnlyStatuses,

    viewReceipt,
    approveApplication,
    provisionallyApproveApplication,
    rejectApplication,
    sendNoticeOfConsideration,
    sendNoticeOfConsiderationForRegistration,
    fetchApplications,
    fetchRegistrations,
    getNextApplication,
    getApplicationById,
    getDocument,
    setAsideRegistration,
    openDocInNewTab,
    resetFilters,
    resetFiltersToApplicationsDefault,
    resetFiltersToRegistrationsDefault,
    updateRegistrationStatus,
    getRegistrationById,
    assignApplication,
    unassignApplication,
    assignRegistration,
    unassignRegistration,
    setAsideApplication,
    getApplicationFilingHistory,
    getRegistrationFilingHistory,
    getSnapshotById,
    startEditRentalUnitAddress,
    resetEditRentalUnitAddress,
    saveRentalUnitAddress,
    rentalUnitAddressSchema
  }
}, { persist: true }) // will persist data in session storage
