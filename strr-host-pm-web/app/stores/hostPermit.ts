import { v4 as uuidv4 } from 'uuid'
import type { ApiHostApplication, HostApplicationResp, HostRegistrationResp } from '~/interfaces/host-api'
import { formatHostUnitAddressUI, formatHostUnitDetailsUI } from '~/utils/host-formatting'

export const useHostPermitStore = defineStore('host/permit', () => {
  const { t } = useI18n()
  const { getAccountApplications } = useStrrApi()
  const ownerStore = useHostOwnerStore()
  const propertyStore = useHostPropertyStore()
  const propertyReqStore = usePropertyReqStore()
  const documentStore = useDocumentStore()
  const { hostOwners } = storeToRefs(ownerStore)
  const { blInfo, unitAddress, unitDetails } = storeToRefs(propertyStore)
  const { prRequirements, propertyReqs, showUnitDetailsForm } = storeToRefs(propertyReqStore)
  const { storedDocuments } = storeToRefs(documentStore)

  const {
    application,
    registration,
    permitDetails,
    isPaidApplication,
    showPermitDetails,
    loadPermitData,
    downloadApplicationReceipt,
    downloadRegistrationCert
  } = useStrrBasePermit<HostRegistrationResp, HostApplicationResp, ApiHostApplication>()

  const loadHostData = async (applicationId: string, loadDraft = false) => {
    $reset()
    await loadPermitData(applicationId)
    if (showPermitDetails.value || loadDraft) {
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
        loading: false
      })) || []
    }
  }

  const loadHostPmList = async () => {
    // TODO: implement pagination
    // Load the full list of host applications (up to 50 maximum)
    return await getAccountApplications<HostApplicationResp>(undefined, ApplicationType.HOST)
      .catch((e) => {
        logFetchError(e, 'Unable to load account applications')
        return undefined
      }).then((response) => {
        if (response) {
          return (response as HostApplicationResp[]).map(app => ({
            name: app.registration.unitAddress?.nickname || t('label.unnamed'),
            address: app.registration.unitAddress,
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
    ownerStore.$reset()
    propertyStore.$reset()
    documentStore.$reset()
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
    downloadRegistrationCert,
    loadHostData,
    loadHostPmList,
    $reset
  }
})
