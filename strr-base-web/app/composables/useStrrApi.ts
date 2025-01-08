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

  const getAccountApplications = async <T extends ApiApplicationBaseResp>(
    id?: string,
    type?: ApplicationType
  ) => {
    if (id) {
      return await $strrApi<T>(`/applications/${id}`).catch((e) => {
        logFetchError(e, `Unable to get application details for ${id}`)
        return undefined
      })
    }
    const resp = await $strrApi<{ applications: T[] }>('/applications', {
      query: {
        registrationType: type
      }
    })
    return resp.applications
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
    getAccountRegistrations,
    getAccountApplications,
    getApplicationReceipt,
    getRegistrationCert,
    postApplication,
    updatePaymentDetails
  }
}
