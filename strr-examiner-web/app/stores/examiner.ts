export const useExaminerStore = defineStore('strr/examiner-store', () => {
  const { getAccountApplications } = useStrrApi()

  const { $strrApi } = useNuxtApp()

  const tableLimit = ref(50)
  const tablePage = ref(1)
  const tableFilters = reactive({
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

  return {
    tableFilters,
    tableLimit,
    tablePage,
    approveApplication,
    rejectApplication,
    getNextApplication,
    getDocument,
    openDocInNewTab
  }
}, { persist: true }) // will persist data in session storage
