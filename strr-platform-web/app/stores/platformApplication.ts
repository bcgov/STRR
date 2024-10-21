export const useStrrPlatformApplication = defineStore('strr/platformApplication', () => {
  const { $strrApi } = useNuxtApp()
  const { completingParty, primaryRep, secondaryRep } = storeToRefs(useStrrPlatformContact())
  const { platformBusiness } = storeToRefs(useStrrPlatformBusiness())
  const { platformDetails } = storeToRefs(useStrrPlatformDetails())
  const strrModal = useStrrModals()

  const confirmInfoAccuracy = ref(false)
  const confirmDelistAndCancelBookings = ref(false)

  function createApplicationBody (): PlatformApplicationPayload {
    const applicationBody: PlatformApplicationPayload = {
      registration: {
        registrationType: ApplicationType.PLATFORM,
        completingParty: formatParty(completingParty.value),
        platformRepresentatives: [],
        businessDetails: formatBusinessDetails(platformBusiness.value),
        platformDetails: formatPlatformDetails(platformDetails.value)
      }
    }

    if (primaryRep.value !== undefined) {
      applicationBody.registration.platformRepresentatives.push(
        formatRepresentative(primaryRep.value)
      )
    }

    if (secondaryRep.value !== undefined) {
      applicationBody.registration.platformRepresentatives.push(
        formatRepresentative(secondaryRep.value)
      )
    }

    return applicationBody
  }

  async function submitPlatformApplication () {
    // validate all forms/fields first??
    try {
      const body = createApplicationBody()

      // console.log('submitting application: ', body)
      await $strrApi('/applications', {
        method: 'POST',
        body
      })
    } catch (e) {
      logFetchError(e, 'Error creating platform application')
      strrModal.openAppSubmitError() // pass in error object ??
    }
  }

  return {
    confirmInfoAccuracy,
    confirmDelistAndCancelBookings,
    // getPlatformApplication,
    submitPlatformApplication
  }
})
