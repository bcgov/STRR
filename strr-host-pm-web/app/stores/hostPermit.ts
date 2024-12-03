import type { ApiHostApplication, HostApplicationResp, HostRegistrationResp } from '~/interfaces/host-api'
import { formatHostUnitAddressUI, formatHostUnitDetailsUI } from '~/utils/host-formatting'

export const useHostPermitStore = defineStore('host/permit', () => {
  const { getAccountApplications } = useStrrApi()
  const ownerStore = useHostOwnerStore()
  const propertyStore = useHostPropertyStore()
  // TODO: load application documents during 'loadHostsData'
  const documentStore = useDocumentStore()
  const { hostOwners } = storeToRefs(ownerStore)
  const { unitAddress, unitDetails } = storeToRefs(propertyStore)

  const {
    application,
    registration,
    permitDetails,
    isPaidApplication,
    showPermitDetails,
    loadPermitData,
    downloadApplicationReceipt
  } = useStrrBasePermit<HostRegistrationResp, HostApplicationResp, ApiHostApplication>()

  const loadHostData = async (applicationId: string) => {
    $reset()
    await loadPermitData(applicationId)
    if (showPermitDetails.value) {
      // set sub store values
      hostOwners.value.push(formatOwnerHostUI(
        permitDetails.value.primaryContact,
        !permitDetails.value.propertyManager?.initiatedByPropertyManager
      ))
      if (permitDetails.value.secondaryContact) {
        hostOwners.value.push(formatOwnerHostUI(permitDetails.value.secondaryContact, false, true))
      }
      if (permitDetails.value.propertyManager) {
        hostOwners.value.push(formatOwnerPropertyManagerUI(permitDetails.value.propertyManager))
      }
      unitDetails.value = formatHostUnitDetailsUI(permitDetails.value.unitDetails)
      unitAddress.value = { address: formatHostUnitAddressUI(permitDetails.value.unitAddress) }
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
    loadHostData,
    loadHostPmList,
    $reset
  }
})
