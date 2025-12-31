import type { ApplicationSortBy, ApplicationSortOrder } from '~/enums/applications-sort-e'
import type { ApiRegistrationTodoTaskResp } from '~/interfaces/strr-api'

export const useStrrApi = () => {
  const { $strrApi } = useNuxtApp()

  const getAccountRegistrations = async <T extends ApiBaseRegistration>(
    id?: number | string,
    type?: ApplicationType,
    limit?: number,
    offset?: number
  ) => {
    if (id) {
      return await $strrApi<T>(`/registrations/${id}`).catch((e) => {
        logFetchError(e, `Unable to get registration details for ${id}`)
        return undefined
      })
    }
    return await $strrApi<{ registrations: T[], total: number }>('/registrations', {
      query: {
        limit,
        offset,
        registration_type: type
      }
    })
  }

  const getAccountApplication = async <T extends ApiApplicationBaseResp>(
    id?: string,
    type?: ApplicationType
  ) => {
    if (id) {
      return await $strrApi<T>(`/applications/${id}`).catch((e) => {
        logFetchError(e, `Unable to get application details for ${id}`)
        return undefined
      })
    }
    // No specific ID given so get the most recent application for the account
    return await getAccountApplications(1, 1, type).then((resp) => {
      if (resp.applications?.length) {
        return resp.applications[0]
      }
    }).catch((e) => {
      logFetchError(e, 'Unable to get most recent account application details')
      return undefined
    })
  }

  const getAccountApplications = async <T extends ApiApplicationBaseResp>(
    limit = 50,
    page = 1,
    registrationType?: ApplicationType,
    status?: ApplicationStatus | ApplicationStatus[],
    sortBy?: ApplicationSortBy,
    sortOrder?: ApplicationSortOrder,
    includeDraftRegistration?: boolean,
    includeDraftRenewal?: boolean
  ) => {
    return await $strrApi<{ applications: T[], total: number }>('/applications', {
      query: {
        limit,
        page,
        registrationType,
        status,
        sortBy,
        sortOrder,
        includeDraftRegistration,
        includeDraftRenewal
      }
    })
  }

  const postApplication = async <T extends { registration: any }, R extends T>(
    body: T,
    isDraft = false,
    applicationId?: string
  ) => {
    const path = applicationId ? `/applications/${applicationId}` : '/applications'
    return await $strrApi<R>(path, {
      method: applicationId ? 'PUT' : 'POST',
      headers: (isDraft ? { isDraft: true } : {}) as HeadersInit,
      body
    })
  }

  const deleteApplication = async (applicationId: string) => {
    return await $strrApi(`/applications/${applicationId}`, { method: 'DELETE' })
  }

  const getApplicationReceipt = async (applicationNumber: string) => {
    return await $strrApi<Blob>(`/applications/${applicationNumber}/payment/receipt`)
      .catch((e) => {
        logFetchError(e, `Unable to get application receipt for ${applicationNumber}`)
        return undefined
      })
  }

  const getRegistrationCert = async (registrationId: string | number) => {
    return await $strrApi<Blob>(`/registrations/${registrationId}/certificate`)
      .catch((e) => {
        logFetchError(e, `Unable to get registration certificate for ${registrationId}`)
        return undefined
      })
  }

  // Get a list of todo tasks for specific registration
  const getRegistrationToDos = async (registrationId: number): Promise<{todos: ApiRegistrationTodoTaskResp[]}> => {
    return await $strrApi<{ todos: ApiRegistrationTodoTaskResp[]}>(`/registrations/${registrationId}/todos`)
      .catch((e) => {
        logFetchError(e, `Unable to get registration todos for ${registrationId}`)
        return { todos: [] }
      })
  }

  const updatePaymentDetails = async <T extends ApiApplicationBaseResp>(applicationNumber: string) => {
    return await $strrApi<T>(`/applications/${applicationNumber}/payment-details`,
      { method: 'PUT' })
  }

  const searchApplications = async <T extends ApiApplicationBaseResp>(
    searchText?: string,
    limit = 50,
    page = 1,
    status?: ApplicationStatus | ApplicationStatus[],
    recordNumber?: string,
    registrationStatus?: string[],
    registrationType?: ApplicationType | ApplicationType[],
    sortBy?: ApplicationSortBy,
    sortOrder?: ApplicationSortOrder
  ) => {
    return await $strrApi<{ applications: T[], total: number }>('/applications/user/search', {
      query: {
        text: searchText,
        limit,
        page,
        status,
        recordNumber,
        registrationStatus,
        registrationType,
        sortBy,
        sortOrder
      }
    })
  }

  const searchRegistrations = async <T extends ApiBaseRegistration>(
    searchText?: string,
    limit = 50,
    page = 1,
    status?: string[],
    recordNumber?: string,
    registrationType?: ApplicationType | ApplicationType[],
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ) => {
    return await $strrApi<{ registrations: T[], total: number }>('/registrations/user/search', {
      query: {
        text: searchText,
        limit,
        page,
        status,
        recordNumber,
        registrationType,
        sortBy,
        sortOrder
      }
    })
  }

  return {
    deleteApplication,
    getAccountRegistrations,
    getAccountApplication,
    getAccountApplications,
    getApplicationReceipt,
    getRegistrationCert,
    getRegistrationToDos,
    postApplication,
    updatePaymentDetails,
    searchApplications,
    searchRegistrations
  }
}
