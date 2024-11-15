export const useStrrPlatformStore = defineStore('strr/platform', () => {
  const contactStore = useStrrContactStore()
  const businessStore = useStrrPlatformBusiness()
  const detailsStore = useStrrPlatformDetails()
  const { completingParty, primaryRep, secondaryRep } = storeToRefs(contactStore)
  const { platformBusiness } = storeToRefs(businessStore)
  const { platformDetails } = storeToRefs(detailsStore)

  const {
    application,
    registration,
    permitDetails,
    isPaidApplication,
    showPermitDetails,
    downloadApplicationReceipt,
    loadPermitData
  } = useStrrBasePermit<PlatformRegistrationResp, PlatformApplicationResp>()

  const loadPlatform = async () => {
    await loadPermitData(undefined, ApplicationType.PLATFORM)
    if (application.value) {
      // set completing party info (this data is only in the application)
      completingParty.value = formatPartyUI(application.value.registration.completingParty)
    }
    if (showPermitDetails.value) {
      // set relevant sub store values to active platform data
      primaryRep.value = formatRepresentativeUI(permitDetails.value.platformRepresentatives[0])
      // should only ever be 2 reps at most
      if (permitDetails.value.platformRepresentatives?.length > 1) {
        secondaryRep.value = formatRepresentativeUI(permitDetails.value.platformRepresentatives[1])
      }
      platformBusiness.value = formatBusinessDetailsUI(permitDetails.value.businessDetails)
      platformDetails.value = permitDetails.value.platformDetails
    }
  }

  const $reset = () => {
    contactStore.$reset()
    businessStore.$reset()
    detailsStore.$reset()
    application.value = undefined
    registration.value = undefined
  }

  return {
    application,
    registration,
    permitDetails,
    isPaidApplication,
    showPermitDetails,
    downloadApplicationReceipt,
    loadPlatform,
    $reset
  }
})
