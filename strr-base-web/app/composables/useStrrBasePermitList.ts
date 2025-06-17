import type { ApiApplicationBaseResp, ApiBaseRegistration } from '~/interfaces/strr-api'

export const useStrrBasePermitList = <A extends ApiApplicationBaseResp>(
  setType?: ApplicationType, setStatus?: ApplicationStatus
) => {
  const { getAccountApplications } = useStrrApi()

  const limit = ref(50)
  const page = ref(1)
  const status = ref<ApplicationStatus | undefined>(setStatus)
  const type = ref<ApplicationType | undefined>(setType)

  const getApplicationList = async () => {
    return await getAccountApplications<A>(limit.value, page.value, type.value, status.value)
      .catch((e) => {
        logFetchError(e, 'Unable to load account applications')
        return undefined
      })
  }

  return {
    limit,
    page,
    status,
    type,
    getApplicationList
  }
}

export const useStrrBaseCombinedPermitList = <
  A extends ApiApplicationBaseResp,
  R extends ApiBaseRegistration
>(setType?: ApplicationType, setStatus?: ApplicationStatus) => {
  const { getAccountApplications, getAccountRegistrationsPaginated } = useStrrApi()

  const limit = ref(50)
  const page = ref(1)
  const status = ref<ApplicationStatus | undefined>(setStatus)
  const type = ref<ApplicationType | undefined>(setType)

  const getCombinedList = async () => {
    try {
      const registrationStatus = undefined
      const [applicationsResp, registrationsResp] = await Promise.all([
        getAccountApplications<A>(limit.value, page.value, type.value, status.value)
          .catch(() => ({ applications: [], total: 0 })),
        getAccountRegistrationsPaginated<R>(
          limit.value,
          page.value,
          type.value,
          registrationStatus
        ).catch(() => ({ registrations: [], total: 0 }))
      ])

      const registrationsMap = new Map<string, R>()
      registrationsResp.registrations?.forEach((reg) => {
        if ((reg as any).id) {
          registrationsMap.set((reg as any).id.toString(), reg)
        }
      })

      const enhancedApplications = applicationsResp.applications?.map((app) => {
        const registrationId = app.header.registrationId
        if (registrationId && registrationsMap.has(registrationId.toString())) {
          const registration = registrationsMap.get(registrationId.toString())!
          return {
            ...app,
            registrationData: registration
          }
        }
        return app
      }) || []

      return {
        applications: enhancedApplications,
        total: applicationsResp.total,
        registrations: registrationsResp.registrations || []
      }
    } catch (e) {
      logFetchError(e, 'Unable to load combined application and registration data')
      return { applications: [], total: 0, registrations: [] }
    }
  }

  return {
    limit,
    page,
    status,
    type,
    getCombinedList
  }
}
