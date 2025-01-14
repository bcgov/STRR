import { v4 as uuidv4 } from 'uuid'
import { formatBusinessDetailsUI, formatStrataDetailsUI } from '~/utils/strata-formating'

export const useStrrStrataStore = defineStore('strr/strata', () => {
  // TODO: move common pieces of strata and platform to base layer composable
  const contactStore = useStrrContactStore()
  const businessStore = useStrrStrataBusinessStore()
  const detailsStore = useStrrStrataDetailsStore()
  const documentStore = useDocumentStore()
  const { completingParty, primaryRep, secondaryRep, isCompletingPartyRep } = storeToRefs(contactStore)
  const { strataBusiness } = storeToRefs(businessStore)
  const { strataDetails } = storeToRefs(detailsStore)
  const { storedDocuments } = storeToRefs(documentStore)

  const {
    application,
    registration,
    permitDetails,
    isPaidApplication,
    showPermitDetails,
    loadPermitData,
    downloadApplicationReceipt
  } = useStrrBasePermit<StrataRegistrationResp, StrataApplicationResp, ApiBaseStrataApplication>()

  const loadStrata = async (applicationId: string, loadDraft = false) => {
    $reset()
    await loadPermitData(applicationId)
    if (application.value) {
      // set completing party info (this data is only in the application)
      completingParty.value = formatPartyUI(application.value.registration.completingParty)
    }
    if (showPermitDetails.value || loadDraft) {
      // set relevant sub store values to active platform data
      if (permitDetails.value.strataHotelRepresentatives?.length > 0) {
        // @ts-expect-error - strataHotelRepresentatives[0] will always be defined here
        primaryRep.value = formatRepresentativeUI(permitDetails.value.strataHotelRepresentatives[0])
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
      if (permitDetails.value.strataHotelRepresentatives?.length > 1) {
        // @ts-expect-error - strataHotelRepresentatives[1] will always be defined here
        secondaryRep.value = formatRepresentativeUI(permitDetails.value.strataHotelRepresentatives[1])
      }
      strataBusiness.value = formatBusinessDetailsUI(permitDetails.value.businessDetails)
      if (!strataBusiness.value.hasRegOffAtt && loadDraft) {
        // api does not save this value so we have to assume it was not selected yet for drafts
        strataBusiness.value.hasRegOffAtt = undefined
      }
      strataDetails.value = formatStrataDetailsUI(permitDetails.value.strataHotelDetails)

      storedDocuments.value = permitDetails.value.documents?.map<UiDocument>(val => ({
        file: {} as File,
        apiDoc: val,
        name: val.fileName,
        type: val.documentType,
        id: uuidv4(),
        loading: false
      })) || []
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
    loadStrata,
    $reset
  }
})
