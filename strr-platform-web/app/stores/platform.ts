export const useStrrPlatformStore = defineStore('strr/platform', () => {
  const { getAccountApplications, getAccountRegistrations } = useStrrApi()
  const { primaryRep, secondaryRep } = storeToRefs(useStrrContactStore())
  const { platformBusiness } = storeToRefs(useStrrPlatformBusiness())
  const { platformDetails } = storeToRefs(useStrrPlatformDetails())

  const activeApplicationInfo = ref<ApplicationHeader | undefined>(undefined)
  const activePlatform = ref<PlatformRegistrationResp | ApiBasePlatformRegistration | undefined>(undefined)

  // @ts-expect-error - registration_number will only be there for registrations
  const isRegistration = computed(() => !!activePlatform.value?.registration_number)

  const isApplicationStatus = (statuses: ApplicationStatus[]) =>
    statuses.includes(activeApplicationInfo.value?.status as ApplicationStatus)

  const isPaidApplication = computed(() =>
    !!activeApplicationInfo.value && !isApplicationStatus([ApplicationStatus.DRAFT, ApplicationStatus.PAYMENT_DUE]))

  const showPlatformDetails = computed(() => isRegistration.value ||
    (activeApplicationInfo.value && !isApplicationStatus([ApplicationStatus.DECLINED, ApplicationStatus.DRAFT])))

  const loadPlatform = async () => {
    // get registrations under this account
    const registrations = await getAccountRegistrations<PlatformRegistrationResp>() as PlatformRegistrationResp[]
    if (registrations.length) {
      // set active platform to the most recent registration (ordered by api)
      activePlatform.value = registrations[0]
    } else {
      // No registrations under the account so get applications
      const applications = await getAccountApplications<PlatformApplicationResp>() as PlatformApplicationResp[]
      if (applications.length) {
        // set active platform to the most recent application (ordered by api)
        activePlatform.value = applications[0]?.registration
        // set application header info
        activeApplicationInfo.value = applications[0]?.header
      }
    }

    if (activePlatform.value && (isRegistration.value || showPlatformDetails.value)) {
      // set relevant sub store values to active platform data
      // @ts-expect-error - key at index 0 should always exist here
      primaryRep.value = formatRepresentativeUI(activePlatform.value.platformRepresentatives[0])
      // should only ever be 2 reps at most
      if (activePlatform.value.platformRepresentatives?.length > 1) {
        // @ts-expect-error - key at index 0 should always exist here
        secondaryRep.value = formatRepresentativeUI(activePlatform.value.platformRepresentatives[1])
      }
      platformBusiness.value = formatBusinessDetailsUI(activePlatform.value.businessDetails)
      platformDetails.value = activePlatform.value.platformDetails
    }
  }

  return {
    activeApplicationInfo,
    activePlatform,
    isRegistration,
    isPaidApplication,
    showPlatformDetails,
    isApplicationStatus,
    loadPlatform
  }
})
