import { formatBusinessDetailsUI, formatStrataDetailsUI } from '~/utils/strata-formating'

export const useStrrStrataStore = defineStore('strr/strata', () => {
  const { getAccountApplications, getAccountRegistrations } = useStrrApi()
  const { primaryRep, secondaryRep } = storeToRefs(useStrrContactStore())
  const { strataBusiness } = storeToRefs(useStrrStrataBusinessStore())
  const { strataDetails } = storeToRefs(useStrrStrataDetailsStore())
  const { t } = useI18n()

  const activeApplicationInfo = ref<ApplicationHeader | undefined>(undefined)
  const activeStrata = ref<StrataRegistrationResp | ApiBaseStrataRegistration | undefined>(undefined)

  // @ts-expect-error - registration_number will only be there for registrations
  const isRegistration = computed(() => !!activeStrata.value?.registration_number)

  const isApplicationStatus = (statuses: ApplicationStatus[]) =>
    statuses.includes(activeApplicationInfo.value?.status as ApplicationStatus)

  const isPaidApplication = computed(() =>
    !!activeApplicationInfo.value && !isApplicationStatus([ApplicationStatus.DRAFT, ApplicationStatus.PAYMENT_DUE]))

  const showStrataDetails = computed(() => isRegistration.value ||
    (activeApplicationInfo.value && !isApplicationStatus([ApplicationStatus.DECLINED, ApplicationStatus.DRAFT])))

  const loadStrata = async (id: string) => {
    // get registrations under this account
    const registration = await getAccountRegistrations<StrataRegistrationResp>(id) as StrataRegistrationResp
    if (registration) {
      // set active strata to the most recent registration (ordered by api)
      activeStrata.value = registration
    } else {
      // No registrations under the account so get applications
      const application = await getAccountApplications<StrataApplicationResp>(id) as StrataApplicationResp
      if (application) {
        // set active strata to the most recent application (ordered by api)
        activeStrata.value = application.registration
        // set application header info
        activeApplicationInfo.value = application.header
      }
    }

    if (activeStrata.value && (isRegistration.value || showStrataDetails.value)) {
      // set relevant sub store values to active strata data
      // @ts-expect-error - key at index 0 should always exist here
      primaryRep.value = formatRepresentativeUI(activeStrata.value.strataHotelRepresentatives[0])
      // should only ever be 2 reps at most
      if (activeStrata.value.strataHotelRepresentatives?.length > 1) {
        // @ts-expect-error - key at index 0 should always exist here
        secondaryRep.value = formatRepresentativeUI(activeStrata.value.strataHotelRepresentatives[1])
      }
      strataBusiness.value = formatBusinessDetailsUI(activeStrata.value.businessDetails)
      strataDetails.value = formatStrataDetailsUI(activeStrata.value.strataHotelDetails)
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
            expiryDate: reg.expiryDate,
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
            expiryDate: '-',
            status: app.header.status
          }))
        }
        return []
      })

    return [...apps, ...regs]
  }

  return {
    activeApplicationInfo,
    activeStrata,
    isRegistration,
    isPaidApplication,
    showStrataDetails,
    isApplicationStatus,
    loadStrata,
    loadStrataHotelList
  }
})
