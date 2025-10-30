import type { ApiApplicationBaseResp } from '~/interfaces/strr-api'

export const useStrrBasePermitList = <A extends ApiApplicationBaseResp>(
  setType?: ApplicationType, setStatus?: ApplicationStatus
) => {
  const { getAccountApplications } = useStrrApi()

  const limit = ref(50)
  const page = ref(1)
  const status = ref<ApplicationStatus | undefined>(setStatus)
  const type = ref<ApplicationType | undefined>(setType)
  const sortBy = ref<ApplicationSortBy | undefined>(undefined)
  const sortOrder = ref<ApplicationSortOrder | undefined>(undefined)
  const includeDraftRegistration = ref<boolean | undefined>(undefined)
  const includeDraftRenewal = ref<boolean | undefined>(undefined)

  const getApplicationList = async () => {
    return await getAccountApplications<A>(
      limit.value,
      page.value,
      type.value,
      status.value,
      sortBy.value,
      sortOrder.value,
      includeDraftRegistration.value,
      includeDraftRenewal.value
    )
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
    sortBy,
    sortOrder,
    includeDraftRegistration,
    includeDraftRenewal,
    getApplicationList
  }
}
