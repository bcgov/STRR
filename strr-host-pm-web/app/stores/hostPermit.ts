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
    downloadRegistrationCert,
    openDocInNewTab,
    getDocument
  } = useStrrBasePermit<HostRegistrationResp, HostApplicationResp, ApiHostApplication>()
  const { searchRegistrations } = useStrrApi()

  const { isBusinessLicenseDocumentUploadEnabled } = useHostFeatureFlags()

  const { t } = useI18n()

  const renewalRegId = ref<string | undefined>(undefined)
  const isRegistrationRenewal = ref(false)
  const selectedRegistrationId = ref<string | undefined>(undefined)

  const SELECTED_REGISTRATION_ID_KEY = 'selectedRegistrationId'

  /** Registration id for renewal entry: in-flight renew context, dashboard selection, or payment return. */
  const effectiveRegistrationId = computed((): string | undefined => {
    if (renewalRegId.value) {
      return renewalRegId.value
    }
    if (selectedRegistrationId.value) {
      return selectedRegistrationId.value
    }
    return sessionStorage.getItem(SELECTED_REGISTRATION_ID_KEY) ?? undefined
  })

  const setRenewalRegistrationContext = (registrationId: string | number) => {
    const id = String(registrationId)
    renewalRegId.value = id
    selectedRegistrationId.value = id
  }

  const clearRenewalRegistrationContext = () => {
    renewalRegId.value = undefined
  }

  const persistSelectedRegistrationId = (registrationId: string | number) => {
    const id = String(registrationId)
    selectedRegistrationId.value = id
    sessionStorage.setItem(SELECTED_REGISTRATION_ID_KEY, id)
  }

  const readStoredSelectedRegistrationId = (): string | undefined => {
    return sessionStorage.getItem(SELECTED_REGISTRATION_ID_KEY) ?? undefined
  }

  const clearStoredSelectedRegistrationId = () => {
    sessionStorage.removeItem(SELECTED_REGISTRATION_ID_KEY)
  }

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
    selectedRegistrationId.value = registrationId
    await loadPermitRegistrationData(registrationId)
    await populateHostDetails(isRenewal)
  }

  const loadHostRegistrationDataByRegistrationNumber = async (registrationNumber: string) => {
    selectedRegistrationId.value = undefined
    $reset()
    const resp = await searchRegistrations<ApiRegistrationResp>(
      undefined,
      10,
      1,
      undefined,
      registrationNumber,
      ApplicationType.HOST
    )
    const matchedRegistration = resp?.registrations?.find(
      registration => registration.registrationNumber === registrationNumber
    )
    if (!matchedRegistration?.id) {
      return false
    }
    selectedRegistrationId.value = matchedRegistration.id.toString()
    await loadHostRegistrationData(selectedRegistrationId.value)
    return true
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
    selectedRegistrationId.value = undefined
  }

  // Dashboard state cached in store to prevent redundant network requests on view switches
  const dashboardRegistrations = ref<RegistrationRecordWithTodos[]>([])
  const dashboardRegistrationsTotal = ref<number>(0)
  const dashboardApplications = ref<HostApplicationResp['applications']>([])
  const dashboardApplicationsTotal = ref<number>(0)
  const isDashboardLoading = ref<boolean>(false)
  const dashboardDataLoaded = ref<boolean>(false)

  const loadDashboardData = async (force = false, search?: string) => {
    if (!force && !search && dashboardDataLoaded.value) {
      return {
        registrations: dashboardRegistrations.value,
        totalRegistrations: dashboardRegistrationsTotal.value,
        applications: dashboardApplications.value,
        totalApplications: dashboardApplicationsTotal.value
      }
    }

    isDashboardLoading.value = true
    try {
      const allowedStatuses = [
        ApplicationStatus.DRAFT,
        ApplicationStatus.PAYMENT_DUE,
        ApplicationStatus.PAID,
        ApplicationStatus.ADDITIONAL_INFO_REQUESTED,
        ApplicationStatus.FULL_REVIEW,
        ApplicationStatus.DECLINED,
        ApplicationStatus.PROVISIONALLY_DECLINED,
        ApplicationStatus.PROVISIONAL,
        ApplicationStatus.NOC_PENDING,
        ApplicationStatus.NOC_EXPIRED,
        ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING,
        ApplicationStatus.PROVISIONAL_REVIEW_NOC_EXPIRED
      ]

      const api = useStrrApi()
      const { fetchRegistrationsWithRenewalTodos } = useRenewals()

      const fetchRegs = async () => {
        let rawRegs: RegistrationRecord[] = []
        let total = 0
        if (search && search.length >= 3) {
          const resp = await api.searchRegistrations<ApiRegistrationResp>(
            search,
            100,
            1,
            undefined,
            undefined,
            ApplicationType.HOST
          )
          if (resp) {
            rawRegs = resp.registrations || []
            total = resp.total || 0
          }
        } else if (api.getAccountRegistrations) {
          const resp = await api.getAccountRegistrations<ApiRegistrationResp>(
            undefined,
            ApplicationType.HOST,
            100,
            1
          )
          if (Array.isArray(resp)) {
            rawRegs = resp
            total = resp.length
          } else {
            rawRegs = resp?.registrations || []
            total = resp?.total || 0
          }
        }
        const withTodos = fetchRegistrationsWithRenewalTodos
          ? await fetchRegistrationsWithRenewalTodos(rawRegs)
          : rawRegs
        return { registrations: withTodos, total }
      }

      const fetchApps = async () => {
        if (search && search.length >= 3) {
          if (api.searchApplications) {
            const resp = await api.searchApplications<HostApplicationResp>(
              search,
              100,
              1,
              allowedStatuses,
              undefined,
              undefined,
              ApplicationType.HOST
            )
            return {
              applications: resp?.applications || [],
              total: resp?.total || 0
            }
          }
          return { applications: [], total: 0 }
        } else if (api.getAccountApplications) {
          const resp = await api.getAccountApplications<HostApplicationResp>(
            100,
            1,
            ApplicationType.HOST,
            allowedStatuses,
            undefined,
            undefined,
            true,
            true
          )
          return {
            applications: resp?.applications || [],
            total: resp?.total || 0
          }
        }
        return { applications: [], total: 0 }
      }

      const [regsResult, appsResult] = await Promise.all([fetchRegs(), fetchApps()])
      dashboardRegistrations.value = regsResult.registrations
      dashboardRegistrationsTotal.value = regsResult.total
      dashboardApplications.value = appsResult.applications
      dashboardApplicationsTotal.value = appsResult.total
      if (!search) {
        dashboardDataLoaded.value = true
      }
      return {
        registrations: dashboardRegistrations.value,
        totalRegistrations: dashboardRegistrationsTotal.value,
        applications: dashboardApplications.value,
        totalApplications: dashboardApplicationsTotal.value
      }
    } finally {
      isDashboardLoading.value = false
    }
  }

  const refreshDashboardData = () => {
    return loadDashboardData(true)
  }

  const clearDashboardData = () => {
    dashboardRegistrations.value = []
    dashboardRegistrationsTotal.value = 0
    dashboardApplications.value = []
    dashboardApplicationsTotal.value = 0
    dashboardDataLoaded.value = false
    isDashboardLoading.value = false
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
    effectiveRegistrationId,
    setRenewalRegistrationContext,
    clearRenewalRegistrationContext,
    persistSelectedRegistrationId,
    readStoredSelectedRegistrationId,
    clearStoredSelectedRegistrationId,
    needsBusinessLicenseDocumentUpload,
    checkBusinessLicenseRequirement,
    downloadApplicationReceipt,
    downloadRegistrationCert,
    openDocInNewTab,
    getDocument,
    loadHostData,
    loadHostRegistrationData,
    loadHostRegistrationDataByRegistrationNumber,
    dashboardRegistrations,
    dashboardRegistrationsTotal,
    dashboardApplications,
    dashboardApplicationsTotal,
    isDashboardLoading,
    dashboardDataLoaded,
    loadDashboardData,
    refreshDashboardData,
    clearDashboardData,
    $reset
  }
})
