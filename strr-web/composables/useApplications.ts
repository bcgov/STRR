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
    userFirstName: string,
    userLastName: string,
    hasSecondaryContact: boolean,
    propertyType: string,
    ownershipType: string,
    registrationType: RegistrationTypeE = RegistrationTypeE.HOST
  ) => {
    const formData: CreateAccountFormAPII = formStateToApi(
      formState,
      userFirstName,
      userLastName,
      hasSecondaryContact,
      propertyType,
      ownershipType
    )

    try {
      // add registration type to payload
      formData.registration.registrationType = registrationType

      if (formState.supportingDocuments.length) {
        // upload all document and add its info to the application data
        const documents: DocumentUploadI[] = await uploadSupportingDocuments()
        formData.registration.documents = documents
      }

      const { data } = await axiosInstance.post(`${apiURL}/applications`, formData)

      if (!data) {
        throw new Error('Invalid AUTH API response')
      }

      const { paymentToken, id } = data.header
      handlePaymentRedirect(paymentToken, id)

      return data
    } catch (error) {
      console.warn('Error creating account.')
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
   * @param {string} id - The Id of the application to retrieve.
   */
  const getApplication = async (id: string): Promise<ApplicationI> => {
    const { data } = await axiosInstance.get(`${apiURL}/applications/${id}`)
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

  const getApplicationHistory = async (id: string): Promise<FilingHistoryEventI[]> => {
    const { data } = await axiosInstance.get(`${apiURL}/applications/${id}/events`)
    return data
  }

  /**
   * Get/Download Supporting Document file for Application.
   *
   * @param {string} applicationId - The id of the application to which the document belongs.
   * @param {string} fileKey - The key of the document to be retrieved.
   * @returns The file/document
   */
  const getDocument = async (applicationId: string, fileKey: string): Promise<Blob> => {
    const { data } = await axiosInstance.get<Blob>(`${apiURL}/applications/${applicationId}/documents/${fileKey}`, {
      responseType: 'blob'
    })
    return data
  }

  /**
   * Approve an Application by setting its status to APPROVED.
   * @param id - The id of the Application to approve.
   */
  const approveApplication = async (id: string) => {
    try {
      await updateApplicationStatus(id, ApplicationStatusE.APPROVED)
    } catch (error) {
      console.error(error)
    }
  }

  /**
   * Reject an application by setting its status to REJECTED.
   * @param id - The id of the Application to reject.
   */
  const rejectApplication = async (id: string) => {
    try {
      await updateApplicationStatus(id, ApplicationStatusE.REJECTED)
    } catch (error) {
      console.error(error)
    }
  }

  /**
   * Update the status of an application.
   * @param id - The id of the Application.
   * @param status - The status to set for the Application.
   */
  const updateApplicationStatus = async (id: string, status: ApplicationStatusE) => {
    await axiosInstance.put(`${apiURL}/applications/${id}/status`, { status: `${status}` })
    window.location.reload()
  }

  /**
   * Get LTSA records application.
   * @param id - The id of the Application.
   */
  const getLtsa = async (id: string): Promise<LtsaDataI[]> => {
    const res = await axiosInstance.get(`${apiURL}/applications/${id}/ltsa`)
    return res.data
  }

  /**
   * Update the status of an application.
   * @param id - The id of the Application.
   */
  const getAutoApproval = async (id: string): Promise<AutoApprovalDataI[]> => {
    const res = await axiosInstance.get(`${apiURL}/applications/${id}/auto-approval-records`)
    return res.data
  }

  return {
    getApplication,
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
