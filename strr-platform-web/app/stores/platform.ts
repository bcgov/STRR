export const useStrrPlatformStore = defineStore('strr/platform', () => {
  const contactStore = useStrrContactStore()
  const businessStore = useStrrPlatformBusiness()
  const detailsStore = useStrrPlatformDetails()
  const { completingParty, primaryRep, secondaryRep, isCompletingPartyRep } = storeToRefs(contactStore)
  const { platformBusiness } = storeToRefs(businessStore)
  const { platformDetails } = storeToRefs(detailsStore)

  const {
    application,
    registration,
    permitDetails,
    isPaidApplication,
    showPermitDetails,
    downloadApplicationReceipt,
    loadPermitData,
    loadPermitRegistrationData
  } = useStrrBasePermit<PlatformRegistrationResp, PlatformApplicationResp, ApiBasePlatformApplication>()

  const renewalRegId = ref<string | undefined>(undefined)
  const isRegistrationRenewal = ref(false)

  // load Registration into application form (e.g. used for Renewals)
  const loadPlatformRegistrationData = async (registrationId: string) => {
    $reset()
    await loadPermitRegistrationData(registrationId)
    await populatePlatformDetails(false)
  }

  const loadPlatform = async (applicationId?: string, loadDraft = false) => {
    $reset()
    resetRenewal()
    await loadPermitData(applicationId, ApplicationType.PLATFORM)
    populatePlatformDetails(loadDraft)
  }

  const populatePlatformDetails = (loadDraft: boolean) => {
    if (application.value) {
      // set completing party info (this data is only in the application)
      completingParty.value = formatPartyUI(application.value.registration.completingParty)
    }
    if (showPermitDetails.value || loadDraft) {
      // set relevant sub store values to active platform data
      if (permitDetails.value.platformRepresentatives?.length > 0) {
        // @ts-expect-error - platformRepresentatives[0] will always be defined here
        primaryRep.value = formatRepresentativeUI(permitDetails.value.platformRepresentatives[0])
        // set isCompletingPartyRep if primary rep contact info is the same as the completing party info
        isCompletingPartyRep.value = primaryRep.value.firstName === completingParty.value.firstName &&
          primaryRep.value.middleName === completingParty.value.middleName &&
          primaryRep.value.lastName === completingParty.value.lastName &&
          primaryRep.value.emailAddress === completingParty.value.emailAddress &&
          primaryRep.value.phone.countryCode === completingParty.value.phone.countryCode &&
          primaryRep.value.phone.number === completingParty.value.phone.number &&
          primaryRep.value.phone.extension === completingParty.value.phone.extension
      }
      // should only ever be 2 reps at most
      if (permitDetails.value.platformRepresentatives?.length > 1) {
        // @ts-expect-error - platformRepresentatives[1] will always be defined here
        secondaryRep.value = formatRepresentativeUI(permitDetails.value.platformRepresentatives[1])
      }
      platformBusiness.value = formatBusinessDetailsUI(permitDetails.value.businessDetails)
      if (loadDraft) {
        if (!platformBusiness.value.hasCpbc) {
          // api does not save this value so we have to assume it was not selected yet for drafts
          platformBusiness.value.hasCpbc = undefined
        }
        if (!platformBusiness.value.hasRegOffAtt) {
          // api does not save this value so we have to assume it was not selected yet for drafts
          platformBusiness.value.hasRegOffAtt = undefined
        }
      }
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

  const resetRenewal = () => {
    renewalRegId.value = undefined
    isRegistrationRenewal.value = false
  }

  return {
    application,
    registration,
    permitDetails,
    renewalRegId,
    isRegistrationRenewal,
    isPaidApplication,
    showPermitDetails,
    downloadApplicationReceipt,
    loadPlatform,
    loadPlatformRegistrationData,
    $reset
  }
})
