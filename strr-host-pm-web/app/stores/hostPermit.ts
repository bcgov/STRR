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

  const { isBusinessLicenseDocumentUploadEnabled } = useHostFeatureFlags()

  const { t } = useI18n()

  const renewalRegId = ref<string | undefined>(undefined)
  const isRegistrationRenewal = ref(false)
  const selectedRegistrationId = ref<string | undefined>(undefined)

  const needsBusinessLicenseDocumentUpload = computed(() => {
    if (!isBusinessLicenseDocumentUploadEnabled.value || !registration.value) {
      return false
    }

    const jurisdiction = registration.value.unitDetails?.jurisdiction

    const needsBusinessLicense = registration.value.status === RegistrationStatus.ACTIVE &&
      needsBusinessLicenseUpload(jurisdiction)
    return needsBusinessLicense
  })

  const checkBusinessLicenseRequirement = (
    applicationData: any
  ): boolean => {
    if (!isBusinessLicenseDocumentUploadEnabled.value || !applicationData.registration) {
      return false
    }

    if (applicationData.header.registrationStatus !== RegistrationStatus.ACTIVE) {
      return false
    }

    const jurisdiction = applicationData.registration.strRequirements?.organizationNm

    return needsBusinessLicenseUpload(jurisdiction)
  }

  // load Registration data (used for registration detail page and Renewals)
  const loadHostRegistrationData = async (registrationId: string, isRenewal: boolean = false) => {
    $reset()
    await loadPermitRegistrationData(registrationId)
    await populateHostDetails(isRenewal)
  }

  const loadHostData = async (applicationId: string, loadDraft = false, skipRegistration = false) => {
    $reset()
    await loadPermitData(applicationId, undefined, skipRegistration)
    if (showPermitDetails.value || loadDraft) {
      await populateHostDetails()
    }
  }

  // populate stores with host data details
  const populateHostDetails = async (isRenewal: boolean = false) => {
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
    // Normalize null/empty exemption reason so PR docs are required when not exempt
    const prExemptReason = permitDetails.value.unitDetails.prExemptReason || undefined
    prRequirements.value.isPropertyPrExempt = !!prExemptReason
    prRequirements.value.prExemptionReason = prExemptReason
    blRequirements.value.isBusinessLicenceExempt = !!permitDetails.value.unitDetails.blExemptReason

    // populate BL Exempt radio buttons selection and reason
    blRequirements.value.blExemptType =
      permitDetails.value.unitDetails.blExemptReason === t('label.blExemptionReasonOver30')
        ? BlExemptionReason.OVER_30_DAYS
        : BlExemptionReason.OTHER

    blRequirements.value.blExemptReason = permitDetails.value.unitDetails?.blExemptReason ?? ''
    strataHotelCategory.value.category = permitDetails.value.unitDetails.strataHotelCategory
    strataHotelCategory.value.strataHotelRegistrationNumber =
      permitDetails.value.unitDetails.strataHotelRegistrationNumber ?? ''
    if (application.value?.registration.strRequirements && showUnitDetailsForm.value) {
      propertyReqs.value = application.value?.registration.strRequirements
      if (Object.keys(application.value.registration.strRequirements).length === 0) {
        // run the requirements check again in case it has errors (errors are not saved by the api)
        showUnitDetailsForm.value = false
        await propertyReqStore.getPropertyReqs()
      }
    }
    // for registration renewal documents are not prefilled - new docs will be uploaded by Host
    storedDocuments.value = isRenewal
      ? []
      : permitDetails.value?.documents?.map<UiDocument>(val => ({
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
    renewalRegId,
    isRegistrationRenewal,
    selectedRegistrationId,
    needsBusinessLicenseDocumentUpload,
    checkBusinessLicenseRequirement,
    downloadApplicationReceipt,
    downloadRegistrationCert,
    loadHostData,
    loadHostRegistrationData,
    $reset
  }
})
