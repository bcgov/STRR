import axios from 'axios'
import { ApplicationI, ApplicationStatusE, RegistrationTypeE } from '#imports'
const fileAxiosInstance = addAxiosInterceptors(axios.create(), 'multipart/form-data')

export const useApplications = () => {
  const apiURL = useRuntimeConfig().public.strrApiURL
  const axiosInstance = addAxiosInterceptors(axios.create())
  const { handlePaymentRedirect } = useFees()

  /**
   * Create a new STR Application and redirect user to the payment page.
   */
  const createApplication = async (
    hasSecondaryContact: boolean,
    propertyType: string,
    ownershipType: string,
    t: (key: string) => string,
    registrationType: RegistrationTypeE = RegistrationTypeE.HOST
  ) => {
    const submitApplicationPayload: CreateAccountFormAPII = formStateToApi(
      formState,
      hasSecondaryContact,
      propertyType,
      ownershipType,
      t
    )

    try {
      // add registration type to payload
      submitApplicationPayload.registration.registrationType = registrationType

      if (formState.supportingDocuments.length) {
        // upload all document and add its info to the application data
        const documents: DocumentUploadI[] = await uploadSupportingDocuments()
        submitApplicationPayload.registration.documents = documents
      }

      const { data } = await axiosInstance.post(`${apiURL}/applications`, submitApplicationPayload)

      if (!data) {
        throw new Error('Invalid AUTH API response')
      }

      const { paymentToken, applicationNumber } = data.header
      handlePaymentRedirect(paymentToken, applicationNumber)

      return data
    } catch (error) {
      console.warn('Error submitting application.')
      console.error(error)
    }
  }

  const uploadSupportingDocuments = async (): Promise<DocumentUploadI[]> => {
    const uploadDocuments = formState.supportingDocuments.map((file: File) =>
      fileAxiosInstance.post<DocumentUploadI>(`${apiURL}/documents`, { file })
    )

    const results = await Promise.all(uploadDocuments)
    return results.map(res => res.data)
  }

  /**
   * Retrieves STR Application by Id.
   *
   * @param {string} appNum - The application number to retrieve.
   */
  const getApplication = async (appNum: string): Promise<ApplicationI> => {
    const { data } = await axiosInstance.get(`${apiURL}/applications/${appNum}`)
    return data
  }

  /**
   * GET STR Receipt by Application number.
   *
   * @param {string} appNum - The application number.
   */
  const getReceipt = async (appNum: string): Promise<Blob> => {
    const { data } = await axiosInstance.get<Blob>(`${apiURL}/applications/${appNum}/payment/receipt`, {
      responseType: 'blob'
    })
    return data
  }

  /**
   * Get all STR Applications from the API and sorts them by status and city.
   * If no applications are found, the user is redirected to the create account page.
   */
  const getApplications = async (): Promise<PaginatedApplicationsI> => {
    const { data } = await axiosInstance.get<PaginatedApplicationsI>(`${apiURL}/applications`)
    return data
  }

  const getPaginatedApplications = async (paginationObject: SearchApplicationsI): Promise<PaginatedApplicationsI> => {
    // remove all empty params before constructing a query params
    const params = Object.entries(paginationObject).reduce((acc, [key, value]) => {
      if (value !== '') {
        acc[key as keyof SearchApplicationsI] = value
      }
      return acc
    }, {} as Partial<SearchApplicationsI>)

    const queryParams = new URLSearchParams(params as Record<string, string>)

    const { data } = await axiosInstance.get<PaginatedApplicationsI>(`${apiURL}/applications/search?${queryParams}`)
    return data
  }

  const getApplicationsByStatus = async (applicationStatus: ApplicationStatusE): Promise<PaginatedApplicationsI> => {
    const { data } = await axiosInstance.get<PaginatedApplicationsI>(`${apiURL}/applications/search`, {
      params: { status: applicationStatus }
    })
    return data
  }

  const getApplicationHistory = async (appNum: string): Promise<FilingHistoryEventI[]> => {
    const { data } = await axiosInstance.get(`${apiURL}/applications/${appNum}/events`)
    return data
  }

  /**
   * Get/Download Supporting Document file for Application.
   *
   * @param {string} applicationNumber - The application number to which the document belongs.
   * @param {string} fileKey - The key of the document to be retrieved.
   * @returns The file/document
   */
  const getDocument = async (applicationNumber: string, fileKey: string): Promise<Blob> => {
    const { data } = await axiosInstance.get<Blob>(`${apiURL}/applications/${applicationNumber}/documents/${fileKey}`, {
      responseType: 'blob'
    })
    return data
  }

  /**
   * Approve an Application by setting its status to APPROVED.
   * @param appNum - The application number.
   */
  const approveApplication = async (appNum: string) => {
    try {
      await updateApplicationStatus(appNum, ApplicationStatusE.FULL_REVIEW_APPROVED)
    } catch (error) {
      console.error(error)
    }
  }

  /**
   * Reject an application by setting its status to REJECTED.
   * @param appNum - The application number.
   */
  const rejectApplication = async (appNum: string) => {
    try {
      await updateApplicationStatus(appNum, ApplicationStatusE.DECLINED)
    } catch (error) {
      console.error(error)
    }
  }

  /**
   * Update the status of an application.
   * @param appNum - The application number.
   * @param status - The status to set for the Application.
   */
  const updateApplicationStatus = async (appNum: string, status: ApplicationStatusE) => {
    await axiosInstance.put(`${apiURL}/applications/${appNum}/status`, { status: `${status}` })
    window.location.reload()
  }

  /**
   * Get LTSA records application.
   * @param appNum - The application number.
   */
  const getLtsa = async (appNum: string): Promise<LtsaDataI[]> => {
    const res = await axiosInstance.get(`${apiURL}/applications/${appNum}/ltsa`)
    return res.data
  }

  /**
   * Update the status of an application.
   * @param appNum - The application number.
   */
  const getAutoApproval = async (appNum: string): Promise<AutoApprovalDataI[]> => {
    const res = await axiosInstance.get(`${apiURL}/applications/${appNum}/auto-approval-records`)
    return res.data
  }

  return {
    getApplication,
    getReceipt,
    getApplications,
    getApplicationsByStatus,
    getPaginatedApplications,
    createApplication,
    getApplicationHistory,
    getDocument,
    approveApplication,
    rejectApplication,
    getLtsa,
    getAutoApproval
  }
}
