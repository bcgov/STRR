import { formatBusinessDetailsUI, formatStrataDetailsUI } from '~/utils/strata-formating'

export const useStrrStrataStore = defineStore('strr/strata', () => {
  const { getAccountApplications, getAccountRegistrations } = useStrrApi()
  const { primaryRep, secondaryRep } = storeToRefs(useStrrContactStore())
  const { strataBusiness } = storeToRefs(useStrrStrataBusinessStore())
  const { strataDetails } = storeToRefs(useStrrStrataDetailsStore())

  const activeApplicationInfo = ref<ApplicationHeader | undefined>(undefined)
  const activePlatform = ref<StrataRegistrationResp | ApiBaseStrataRegistration | undefined>(undefined)

  // @ts-expect-error - registration_number will only be there for registrations
  const isRegistration = computed(() => !!activePlatform.value?.registration_number)

  const isApplicationStatus = (statuses: ApplicationStatus[]) =>
    statuses.includes(activeApplicationInfo.value?.status as ApplicationStatus)

  const isPaidApplication = computed(() =>
    activeApplicationInfo.value && !isApplicationStatus([ApplicationStatus.DRAFT, ApplicationStatus.PAYMENT_DUE]))

  const showStrataDetails = computed(() => isRegistration.value ||
    (activeApplicationInfo.value && !isApplicationStatus([ApplicationStatus.DECLINED, ApplicationStatus.DRAFT])))

  const loadStrata = async (id: string) => {
    // get registrations under this account
    const registration = await getAccountRegistrations<StrataRegistrationResp>(id) as StrataRegistrationResp
    if (registration) {
      // set active platform to the most recent registration (ordered by api)
      activePlatform.value = registration
    } else {
      // No registrations under the account so get applications
      const application = await getAccountApplications<StrataApplicationResp>(id) as StrataApplicationResp
      if (application) {
        // set active platform to the most recent application (ordered by api)
        activePlatform.value = application.registration
        // set application header info
        activeApplicationInfo.value = application.header
      }
    }

    if (activePlatform.value && (isRegistration.value || showStrataDetails.value)) {
      // set relevant sub store values to active platform data
      // @ts-expect-error - key at index 0 should always exist here
      primaryRep.value = formatRepresentativeUI(activePlatform.value.strataHotelRepresentatives[0])
      // should only ever be 2 reps at most
      if (activePlatform.value.strataHotelRepresentatives?.length > 1) {
        // @ts-expect-error - key at index 0 should always exist here
        secondaryRep.value = formatRepresentativeUI(activePlatform.value.strataHotelRepresentatives[1])
      }
      strataBusiness.value = formatBusinessDetailsUI(activePlatform.value.businessDetails)
      strataDetails.value = formatStrataDetailsUI(activePlatform.value.strataHotelDetails)
    }
  }

  // TODO: move to separate strataDashboard store?
  const registrations = ref([])
  const applications = ref([])

  const loadStrataHotelList = async () => {
    try {
      registrations.value = await getAccountRegistrations()
    } catch (e) {
      logFetchError(e, 'Unable to load account registrations')
    }
    try {
      applications.value = await getAccountApplications()
    } catch (e) {
      logFetchError(e, 'Unable to load account applications')
    }
  }

  return {
    activeApplicationInfo,
    activePlatform,
    isRegistration,
    isPaidApplication,
    showStrataDetails,
    applications,
    registrations,
    isApplicationStatus,
    loadStrata,
    loadStrataHotelList
  }
})
