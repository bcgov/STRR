import axios from 'axios'
import { SbcCreationResponseE } from '~/enums/sbc-creation-response-e'
import { PaginationI } from '~/interfaces/pagination-i'

export const useRegistrations = () => {
  const apiURL = useRuntimeConfig().public.strrApiURL
  const axiosInstance = addAxiosInterceptors(axios.create())
  const { goToCreateAccount } = useBcrosNavigate()

  const getPaginatedRegistrations = (paginationObject: PaginationI): Promise<PaginatedRegistrationsI | void> => {
    const params = new URLSearchParams(paginationObject as unknown as Record<string, string>)
    return axiosInstance.get<PaginatedRegistrationsI>(`${apiURL}/registrations${params.size ? `/?${params}` : ''}`)
      .then(res => res.data)
  }

  const getCountsByStatus = (): Promise<{ APPROVED: number; UNDER_REVIEW: number; PROVISIONAL: number; } | void> =>
    axiosInstance.get(`${apiURL}/registrations/counts_by_status`)
      .then(res => res.data)

  const getRegistration = (id: string): Promise<RegistrationI> =>
    axiosInstance.get(`${apiURL}/registrations/${id}`)
      .then(res => res.data)

  const getRegistrationHistory = (id: string): Promise<FilingHistoryEventI[]> =>
    axiosInstance.get(`${apiURL}/registrations/${id}/events`)
      .then(res => res.data)

  const approveRegistration = (id: string): Promise<any> =>
    axiosInstance.post(`${apiURL}/registrations/${id}/approve`)
      .then(() => window.location.reload())

  const issueCertificate = (id: number): Promise<any> =>
    axiosInstance.post(`${apiURL}/registrations/${id}/certificate`)
      .then(() => window.location.reload())

  const denyRegistration = (id: string): Promise<any> =>
    axiosInstance.post(`${apiURL}/registrations/${id}/deny`)
      .then(() => window.location.reload())

  /**
   * Get/Download Supporting Document file for Registration.
   *
   * @param {string} registrationId - The id of the registration to which the document belongs.
   * @param {string} fileKey - The key of the document to be retrieved.
   * @returns The file/document
   */
  const getDocument = async (registrationId: string, fileKey: string): Promise<Blob> => {
    const { data } = await axiosInstance.get<Blob>(`${apiURL}/registrations/${registrationId}/documents/${fileKey}`, {
      responseType: 'blob'
    })
    return data
  }

  const getCertificate = (id: string): Promise<any> =>
    axiosInstance.get(
      `${apiURL}/registrations/${id}/certificate`,
      { responseType: 'blob' }
    )
      .then(res => res.data)

  const createSbcRegistration = (registration:
    {
      email: string,
      phone: string,
      phoneExtension: string,
      name: string
    }
  ): Promise<SbcCreationResponseE> =>
    axiosInstance
      .post<{
        sbc_account_id: string, id: string
      }>(`${apiURL}/accounts`,
        registration
      )
      .then(async (res) => {
        if (res.data) {
          const { setAccountInfo } = useBcrosAccount()
          await setAccountInfo(res.data.sbc_account_id)
          goToCreateAccount()
          return SbcCreationResponseE.SUCCESS
        }
        return SbcCreationResponseE.ERROR
      })
      .catch((err) => {
        if (err.status === '400') { return SbcCreationResponseE.CONFLICT }
        return SbcCreationResponseE.ERROR
      })

  return {
    getDocument,
    denyRegistration,
    approveRegistration,
    issueCertificate,
    getCountsByStatus,
    createSbcRegistration,
    getPaginatedRegistrations,
    getRegistration,
    getRegistrationHistory,
    getCertificate
  }
}
