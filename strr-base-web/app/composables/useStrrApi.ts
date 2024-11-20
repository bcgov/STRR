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

    const resp = await $strrApi<{ registrations: T[] }>('/registrations', { params: { registrationType: type } })
    return resp.registrations
  }

  const getAccountApplications = async <T extends { registration: ApiBaseRegistration }>(
    id?: string,
    type?: ApplicationType
  ) => {
    if (id) {
      return await $strrApi<T>(`/applications/${id}`).catch((e) => {
        logFetchError(e, `Unable to get application details for ${id}`)
        return undefined
      })
    }

    const resp = await $strrApi<{ applications: T[] }>('/applications', { params: { registrationType: type } })
    return resp.applications
  }

  const postApplication = async <T extends { registration: ApiBaseRegistration }, R extends T>(body: T) => {
    return await $strrApi<R>('/applications', {
      method: 'POST',
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

  return {
    getAccountRegistrations,
    getAccountApplications,
    getApplicationReceipt,
    postApplication
  }
}
