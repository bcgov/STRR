import { v4 as uuidv4 } from 'uuid'
import type { ApiHostApplication, HostApplicationResp, HostRegistrationResp } from '~/interfaces/host-api'
import { formatHostUnitAddressUI, formatHostUnitDetailsUI } from '~/utils/host-formatting'

export const useHostPermitStore = defineStore('host/permit', () => {
  const ownerStore = useHostOwnerStore()
  const propertyStore = useHostPropertyStore()
  const propertyReqStore = usePropertyReqStore()
  const documentStore = useDocumentStore()
  const { hostOwners } = storeToRefs(ownerStore)
  const { blInfo, unitAddress, unitDetails } = storeToRefs(propertyStore)
  const {
    prRequirements,
    propertyReqs,
    blRequirements,
    showUnitDetailsForm,
    strataHotelCategory
  } = storeToRefs(propertyReqStore)
  const { storedDocuments } = storeToRefs(documentStore)

  const {
    application,
    registration,
    permitDetails,
    isPaidApplication,
    showPermitDetails,
    loadPermitData,
    loadPermitRegistrationData,
    downloadApplicationReceipt,
    downloadRegistrationCert
  } = useStrrBasePermit<HostRegistrationResp, HostApplicationResp, ApiHostApplication>()

  const { t } = useI18n()

  const isRegistrationRenewal = ref(false)

  // load Registration into application form (e.g. used for Renewals)
  const loadHostRegistrationData = async (registrationId: string) => {
    $reset()
    await loadPermitRegistrationData(registrationId)
    await populateHostDetails()
  }

  const loadHostData = async (applicationId: string, loadDraft = false) => {
    $reset()
    await loadPermitData(applicationId)
    if (showPermitDetails.value || loadDraft) {
      await populateHostDetails()
    }
  }

  // populate stores with host data details
  const populateHostDetails = async () => {
    // set sub store values
    if (permitDetails.value.primaryContact) {
      hostOwners.value.push(formatOwnerHostUI(
        permitDetails.value.primaryContact,
        !permitDetails.value.propertyManager?.initiatedByPropertyManager
      ))
    }
    if (permitDetails.value.secondaryContact) {
      hostOwners.value.push(formatOwnerHostUI(permitDetails.value.secondaryContact, false, true))
    }
    if (permitDetails.value.propertyManager) {
      hostOwners.value.push(formatOwnerPropertyManagerUI(permitDetails.value.propertyManager))
    }
    unitDetails.value = formatHostUnitDetailsUI(permitDetails.value.unitDetails)
    blInfo.value = formatHostUnitDetailsBlInfoUI(permitDetails.value.unitDetails)
    unitAddress.value = { address: formatHostUnitAddressUI(permitDetails.value.unitAddress) }
    showUnitDetailsForm.value = !!unitAddress.value.address.street || !!unitAddress.value.address.streetAdditional
    prRequirements.value.isPropertyPrExempt = !!permitDetails.value.unitDetails.prExemptReason
    prRequirements.value.prExemptionReason = permitDetails.value.unitDetails.prExemptReason
    blRequirements.value.isBusinessLicenceExempt = !!permitDetails.value.unitDetails.blExemptReason

    // populate BL Exempt radio buttons selection and reason
    blRequirements.value.blExemptType =
    permitDetails.value.unitDetails.blExemptReason === t('label.blExemptionReasonOver30')
      ? BlExemptionReason.OVER_30_DAYS
      : BlExemptionReason.OTHER

    blRequirements.value.blExemptReason = permitDetails.value.unitDetails?.blExemptReason ?? ''
    strataHotelCategory.value.category = permitDetails.value.unitDetails.strataHotelCategory
    if (application.value?.registration.strRequirements && showUnitDetailsForm.value) {
      propertyReqs.value = application.value?.registration.strRequirements
      if (Object.keys(application.value.registration.strRequirements).length === 0) {
        // run the requirements check again in case it has errors (errors are not saved by the api)
        showUnitDetailsForm.value = false
        await propertyReqStore.getPropertyReqs()
      }
    }
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

  const $reset = () => {
    ownerStore.$reset()
    propertyStore.$reset()
    documentStore.$reset()
    application.value = undefined
    registration.value = undefined
    isRegistrationRenewal.value = false
  }

  return {
    application,
    registration,
    permitDetails,
    isPaidApplication,
    showPermitDetails,
    isRegistrationRenewal,
    downloadApplicationReceipt,
    downloadRegistrationCert,
    loadHostData,
    loadHostRegistrationData,
    $reset
  }
})
