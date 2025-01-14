import type { ApiApplicationBaseResp } from '~/interfaces/strr-api'

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
