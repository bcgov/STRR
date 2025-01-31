export const useExaminerStore = defineStore('strr/examiner-store', () => {
  const { getAccountApplications } = useStrrApi()

  const { $strrApi } = useNuxtApp()

  const tableLimit = ref(50)
  const tablePage = ref(1)
  const tableFilters = reactive({
    searchText: '',
    registrationNumber: '',
    registrationType: [],
    requirements: [],
    applicantName: '',
    propertyAddress: '',
    status: [ApplicationStatus.FULL_REVIEW],
    submissionDate: { start: null, end: null },
    lastModified: { start: null, end: null },
    adjudicator: []
  })

  const fetchApplications = () => {
    if (tableFilters.registrationType.length) { // fetch applications by type if type provided
      return $strrApi('/applications', {
        query: {
          limit: tableLimit.value,
          page: tablePage.value,
          registrationType: tableFilters.registrationType[0], // api only allows 1 at a time
          status: tableFilters.status[0] // api only allows 1 at a time
        }
      })
    } else { // else try to fetch by search
      return $strrApi('/applications/search', {
        query: {
          limit: tableLimit.value,
          page: tablePage.value,
          status: tableFilters.status[0], // api only allows 1 at a time
          text: tableFilters.searchText.length > 2 ? tableFilters.searchText : undefined // min length 3 required
        }
      })
    }
  }

  const getNextApplication = async <T extends ApiApplicationBaseResp>(): Promise<T | undefined> => {
    // TODO: update when requirements are flushed out and backend is updated.
    const resp = await getAccountApplications<T>(
      undefined, undefined, ApplicationType.HOST, ApplicationStatus.FULL_REVIEW)
    return resp.applications[0]
  }

  const approveApplication = async (applicationNumber: string): Promise<void> => {
    await $strrApi(`/applications/${applicationNumber}/status`, {
      method: 'PUT',
      body: { status: ApplicationStatus.FULL_REVIEW_APPROVED }
    })
  }

  const rejectApplication = async (applicationNumber: string): Promise<void> => {
    await $strrApi(`/applications/${applicationNumber}/status`, {
      method: 'PUT',
      body: { status: ApplicationStatus.DECLINED }
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
        status: [ApplicationStatus.FULL_REVIEW],
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
    approveApplication,
    rejectApplication,
    fetchApplications,
    getNextApplication,
    getDocument,
    openDocInNewTab,
    resetFilters
  }
}, { persist: true }) // will persist data in session storage
