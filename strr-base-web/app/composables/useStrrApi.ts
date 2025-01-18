export const useStrrApi = () => {
  const { $strrApi } = useNuxtApp()

  const getAccountRegistrations = async <T extends ApiBaseRegistration>(
    id?: number | string,
    type?: ApplicationType
  ) => {
    if (id) {
      return await $strrApi<T>(`/registrations/${id}`).catch((e) => {
        logFetchError(e, `Unable to get registration details for ${id}`)
        return undefined
      })
    }
    // TODO: add type filter in call (need in api first)
    const resp = await $strrApi<{ registrations: T[] }>('/registrations')
    return type
      ? resp.registrations?.filter(reg => reg.registrationType === type)
      : resp.registrations
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
    status?: ApplicationStatus
  ) => {
    return await $strrApi<{ applications: T[], total: number }>('/applications', {
      query: { limit, page, registrationType, status }
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

  const updatePaymentDetails = async <T extends ApiApplicationBaseResp>(applicationNumber: string) => {
    return await $strrApi<T>(`/applications/${applicationNumber}/payment-details`,
      { method: 'PUT' })
  }

  return {
    deleteApplication,
    getAccountRegistrations,
    getAccountApplication,
    getAccountApplications,
    getApplicationReceipt,
    getRegistrationCert,
    postApplication,
    updatePaymentDetails
  }
}
