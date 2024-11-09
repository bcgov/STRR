// TODO: move to strr-base-web layer
export const useStrrApi = () => {
  const { $strrApi } = useNuxtApp()

  const getAccountRegistrations = async <T extends ApiBaseRegistration>(id?: string) => {
    // TODO: add optional filter based on registration type (need in api first)
    if (id) {
      return await $strrApi<T>(`/registrations/${id}`).catch((e) => {
        logFetchError(e, `Unable to get registration details for ${id}`)
        return undefined
      })
    }
    const resp = await $strrApi<{ registrations: T[] }>('/registrations')
    return resp.registrations
  }

  const getAccountApplications = async <T extends { registration: ApiBaseRegistration }>(id?: string) => {
    // TODO: add optional filter based on registration type (need in api first)
    if (id) {
      return await $strrApi<T>(`/applications/${id}`).catch((e) => {
        logFetchError(e, `Unable to get application details for ${id}`)
        return undefined
      })
    }
    const resp = await $strrApi<{ applications: T[] }>('/applications')
    return resp.applications
  }

  const postApplication = async <T extends { registration: ApiBaseRegistration }, R extends T>(body: T) => {
    return await $strrApi<R>('/applications', {
      method: 'POST',
      body
    })
  }

  return {
    getAccountRegistrations,
    getAccountApplications,
    postApplication
  }
}
