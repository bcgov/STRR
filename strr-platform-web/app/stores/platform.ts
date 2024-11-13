export const useStrrPlatformStore = defineStore('strr/platform', () => {
  const { completingParty, primaryRep, secondaryRep } = storeToRefs(useStrrContactStore())
  const { platformBusiness } = storeToRefs(useStrrPlatformBusiness())
  const { platformDetails } = storeToRefs(useStrrPlatformDetails())

  const {
    application,
    registration,
    permitDetails,
    isPaidApplication,
    showPermitDetails,
    loadPermitData
  } = useStrrBasePermit<PlatformRegistrationResp, PlatformApplicationResp>()

  const loadPlatform = async () => {
    await loadPermitData()
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

  return {
    application,
    registration,
    permitDetails,
    isPaidApplication,
    showPermitDetails,
    loadPlatform
  }
})
