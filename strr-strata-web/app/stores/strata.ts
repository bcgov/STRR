import { formatBusinessDetailsUI, formatStrataDetailsUI } from '~/utils/strata-formating'

export const useStrrStrataStore = defineStore('strr/strata', () => {
  // TODO: move common pieces of strata and platform to base layer composable
  const { getAccountApplications, getAccountRegistrations } = useStrrApi()
  const { completingParty, primaryRep, secondaryRep } = storeToRefs(useStrrContactStore())
  const { strataBusiness } = storeToRefs(useStrrStrataBusinessStore())
  const { strataDetails } = storeToRefs(useStrrStrataDetailsStore())
  const { t } = useI18n()

  const {
    application,
    registration,
    permitDetails,
    isPaidApplication,
    showPermitDetails,
    loadPermitData,
    downloadApplicationReceipt
  } = useStrrBasePermit<StrataRegistrationResp, StrataApplicationResp>()

  const loadStrata = async (id: string) => {
    await loadPermitData(id)
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

  const loadStrataHotelList = async () => {
    const regs = await getAccountRegistrations<StrataRegistrationResp>()
      .catch((e) => {
        logFetchError(e, 'Unable to load account registrations')
        return undefined
      })
      .then((response) => {
        if (response) {
          return (response as StrataRegistrationResp[]).filter(
            item => item.registrationType === ApplicationType.STRATA_HOTEL
          ).map(reg => ({
            id: reg.id,
            hotelName: reg.strataHotelDetails.brand.name,
            number: reg.registration_number,
            type: t('label.registration'),
            date: reg.startDate,
            status: reg.status
          }))
        }
        return []
      })

    const apps = await getAccountApplications<StrataApplicationResp>()
      .catch((e) => {
        logFetchError(e, 'Unable to load account applications')
        return undefined
      })
      .then((response) => {
        if (response) {
          return (response as StrataApplicationResp[]).filter(
            item => item.registration.registrationType === ApplicationType.STRATA_HOTEL
          ).map(app => ({
            hotelName: app.registration.strataHotelDetails.brand.name,
            number: app.header.applicationNumber,
            type: t('label.application'),
            date: app.header.applicationDateTime,
            status: app.header.status
          }))
        }
        return []
      })

    return [...apps, ...regs]
  }

  return {
    application,
    registration,
    permitDetails,
    isPaidApplication,
    showPermitDetails,
    downloadApplicationReceipt,
    loadStrata,
    loadStrataHotelList
  }
})
