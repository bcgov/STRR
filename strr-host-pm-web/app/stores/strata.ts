import { formatBusinessDetailsUI, formatStrataDetailsUI } from '~/utils/strata-formating'

export const useStrrStrataStore = defineStore('strr/strata', () => {
  // TODO: move common pieces of strata and platform to base layer composable
  const { getAccountApplications } = useStrrApi()
  const contactStore = useStrrContactStore()
  const businessStore = useStrrStrataBusinessStore()
  const detailsStore = useStrrStrataDetailsStore()
  const { completingParty, primaryRep, secondaryRep } = storeToRefs(contactStore)
  const { strataBusiness } = storeToRefs(businessStore)
  const { strataDetails } = storeToRefs(detailsStore)

  const {
    application,
    registration,
    permitDetails,
    isPaidApplication,
    showPermitDetails,
    loadPermitData,
    downloadApplicationReceipt
  } = useStrrBasePermit<StrataRegistrationResp, StrataApplicationResp>()

  const loadStrata = async (applicationId: string) => {
    await loadPermitData(applicationId)
    if (application.value) {
      // set completing party info (this data is only in the application)
      completingParty.value = formatPartyUI(application.value.registration.completingParty)
    }
    if (showPermitDetails.value) {
      // set relevant sub store values to active platform data
      primaryRep.value = formatRepresentativeUI(permitDetails.value.strataHotelRepresentatives[0])
      // should only ever be 2 reps at most
      if (permitDetails.value.strataHotelRepresentatives?.length > 1) {
        secondaryRep.value = formatRepresentativeUI(permitDetails.value.strataHotelRepresentatives[1])
      }
      strataBusiness.value = formatBusinessDetailsUI(permitDetails.value.businessDetails)
      strataDetails.value = formatStrataDetailsUI(permitDetails.value.strataHotelDetails)
    }
  }

  const loadHostPmList = async () => {
    // Load the full list of strata hotel applications
    return await getAccountApplications(undefined, ApplicationType.HOST)
      .catch((e) => {
        logFetchError(e, 'Unable to load account applications')
        return undefined
      }).then((response) => {
        if (response) {
          return (response as Array<any>).map(app => ({
            property: app.registration.unitAddress,
            number: app.header.registrationNumber || app.header.applicationNumber,
            date: app.header.registrationStartDate || app.header.applicationDateTime,
            lastStatusChange: getLastStatusChangeColumn(app.header),
            daysToExpiry: getDaysToExpiryColumn(app.header),
            status: app.header.registrationStatus || app.header.hostStatus,
            applicationNumber: app.header.applicationNumber // always used for view action
          }))
        }
        return []
      })
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
    loadStrata,
    loadHostPmList,
    $reset
  }
})
