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
    loadPermitRegistrationData,
    downloadApplicationReceipt
  } = useStrrBasePermit<StrataRegistrationResp, StrataApplicationResp, ApiBaseStrataApplication>()

  const renewalRegId = ref<string | undefined>(undefined)
  const isRegistrationRenewal = ref(false)

  const loadStrataRegistrationData = async (registrationId: string) => {
    $reset()
    await loadPermitRegistrationData(registrationId)
    populateStrataDetails()
  }

  const loadStrata = async (applicationId: string, loadDraft: boolean = false) => {
    $reset()
    await loadPermitData(applicationId)
    populateStrataDetails(loadDraft)
  }

  const populateStrataDetails = (loadDraft = false) => {
    if (application.value) {
      // set completing party info (this data is only in the application)
      completingParty.value = formatPartyUI(application.value.registration.completingParty)
    }
    if (showPermitDetails.value || loadDraft) {
      // set relevant sub store values to active platform data
      const strataReps = permitDetails.value.strataHotelRepresentatives

      if (strataReps?.[0]) {
        primaryRep.value = formatRepresentativeUI(strataReps[0])
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
      if (strataReps?.[1]) {
        secondaryRep.value = formatRepresentativeUI(strataReps[1])
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
        loading: false,
        ...(val.uploadStep ? { uploadStep: val.uploadStep } : {}),
        ...(val.uploadDate ? { uploadDate: val.uploadDate } : {})
      })) || []
    }
  }

  const $reset = () => {
    contactStore.$reset()
    businessStore.$reset()
    detailsStore.$reset()
    documentStore.$reset()
    application.value = undefined
    registration.value = undefined
    isRegistrationRenewal.value = false
  }

  return {
    application,
    registration,
    permitDetails,
    renewalRegId,
    isPaidApplication,
    isRegistrationRenewal,
    showPermitDetails,
    downloadApplicationReceipt,
    loadStrataRegistrationData,
    loadStrata,
    $reset
  }
})
