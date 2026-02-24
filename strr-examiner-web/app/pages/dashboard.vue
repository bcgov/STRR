<script setup lang="ts">
import isEmpty from 'lodash/isEmpty'
import { sub } from 'date-fns'

const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const { t } = useNuxtApp().$i18n
// TODO: ApplicationStatus.FULL_REVIEW is temporary until we have reqs defined
// const { limit, page, getApplicationList } = useStrrBasePermitList(undefined, undefined) // leaving this for reference
// const { getAccountApplications } = useStrrApi() // leaving this for reference
const exStore = useExaminerStore()
const ldStore = useConnectLaunchdarklyStore()
const { isSplitDashboardTableEnabled } = useExaminerFeatureFlags()

const enableTableFilters = computed<boolean>(() => {
  const flag = ldStore.getStoredFlag('enable-examiner-table-filters')
  return flag ?? false
})
const enablePropertyAddressFilter = computed<boolean>(() => {
  const flag = ldStore.getStoredFlag('enable-examiner-address-filter')
  return flag ?? false
})
const enableApplicantFilter = computed<boolean>(() => {
  const flag = ldStore.getStoredFlag('enable-examiner-applicant-filter')
  return flag ?? false
})
const enableRequirementFilter = computed<boolean>(() => {
  const flag = ldStore.getStoredFlag('enable-examiner-requirement-filter')
  return flag ?? false
})

const hostOptions = [
  { label: 'Host', value: undefined, disabled: true },
  { label: 'PR', value: 'PR' },
  { label: 'PR Exempt - Farm', value: 'PR_EXEMPT_FARM_LAND' },
  { label: 'PR Exempt - Strata', value: 'PR_EXEMPT_STRATA_HOTEL' },
  { label: 'PR Exempt - Fractional', value: 'PR_EXEMPT_FRACTIONAL_OWNERSHIP' },
  { label: 'BL', value: 'BL' },
  { label: 'Prohibited', value: 'PROHIBITED' },
  { label: 'No requirements', value: 'NO_REQ' }
]

const platformOptions = [
  { label: 'Platform', value: undefined, disabled: true },
  { label: 'Major', value: 'PLATFORM_MAJOR' },
  { label: 'Medium', value: 'PLATFORM_MEDIUM' },
  { label: 'Minor', value: 'PLATFORM_MINOR' }
]

const strataOptions = [
  { label: 'Strata', value: undefined, disabled: true },
  { label: 'PR', value: 'STRATA_PR' },
  { label: 'No requirements', value: 'STRATA_NO_PR' }
]

const requirementOptions = computed(() => {
  const registrationType = exStore.tableFilters.registrationType

  if (!registrationType || registrationType.length === 0) {
    return [...hostOptions, ...platformOptions, ...strataOptions]
  }
  // Dynamic Options
  // Handle one or more selections
  const selectedOptions = new Set()
  registrationType.forEach((type) => {
    if (type === ApplicationType.HOST) {
      hostOptions.forEach(opt => selectedOptions.add(opt))
    } else if (type === ApplicationType.PLATFORM) {
      platformOptions.forEach(opt => selectedOptions.add(opt))
    } else if (type === ApplicationType.STRATA_HOTEL) {
      strataOptions.forEach(opt => selectedOptions.add(opt))
    }
  })
  return Array.from(selectedOptions)
})

const enableSubmissionDateFilter = computed<boolean>(() => {
  const flag = ldStore.getStoredFlag('enable-examiner-submission-date-filter')
  return flag ?? false
})
const enableLastModifiedFilter = computed<boolean>(() => {
  const flag = ldStore.getStoredFlag('enable-examiner-last-modified-filter')
  return flag ?? false
})

// applications or registration tab in split dashboard view
// Initialize from query param first, then sessionStorage (back/logo), then default
const getInitialTab = () => {
  const returnTab = route.query.returnTab as string
  const tab = route.query.tab as string
  if (returnTab) {
    return returnTab === 'applications'
  }
  if (tab) {
    return tab !== 'registrations'
  }
  const savedTab = loadSavedTab()
  if (savedTab !== null) {
    return savedTab
  }
  return true // default to applications
}

const isApplicationTab = ref(getInitialTab())

// Watch for route query changes to restore tab state when navigating back
// Only handle returnTab (from registration page), tab is managed by updateTabQuery
watch(() => route.query.returnTab, (returnTab) => {
  if (returnTab) {
    isApplicationTab.value = returnTab === 'applications'
    // Clean up returnTab from URL after using it and preserve tab parameter
    const query = { ...route.query }
    delete query.returnTab
    if (!query.tab) {
      query.tab = returnTab === 'applications' ? 'applications' : 'registrations'
    }
    router.replace({ query })
  }
}, { immediate: true })

// Persist table state per tab in sessionStorage (restore on mount, save on change)
const { hasSavedAppState } = useExaminerDashboardPersistence(exStore, isApplicationTab)

useHead({
  title: t('page.dashboardList.title')
})

definePageMeta({
  layout: 'examiner',
  middleware: ['auth']
})

const getHostPrRequirements = (hostApplication: ApiHostApplication): string => {
  const { isBusinessLicenceRequired, isPrincipalResidenceRequired, isStrProhibited } =
    hostApplication?.strRequirements as PropertyRequirements

  const { prExemptReason } = hostApplication.unitDetails
  const { strataHotelCategory } = hostApplication.unitDetails

  // build an array of requirements and join non-empty strings with '/'
  return [
    isPrincipalResidenceRequired ? t('page.dashboardList.requirements.host.pr') : '',
    prExemptReason
      ? t(`page.dashboardList.requirements.host.${prExemptReason}`)
      : '',
    strataHotelCategory
      ? t(`strataHotelCategoryReview.${strataHotelCategory}`)
      : '',
    isBusinessLicenceRequired ? t('page.dashboardList.requirements.host.bl') : '',
    isStrProhibited ? t('page.dashboardList.requirements.host.prohibited') : ''
  ].filter(Boolean).join(', ') ||
  // default value where there are no requirements
  t('page.dashboardList.requirements.host.none')
}

const getApplicantNameColumn = (app: HousApplicationResponse) => {
  switch (app.registration.registrationType) {
    case ApplicationType.HOST:
      return displayContactFullName((app.registration as ApiHostApplication).primaryContact) || '-'
    case ApplicationType.STRATA_HOTEL:
      return (app.registration as ApiBaseStrataApplication).businessDetails.legalName || '-'
    default: // platform
      return (app.registration as ApiBasePlatformApplication).businessDetails.legalName || '-'
  }
}

const getApplicantNameColumnForRegistration = (reg: HousRegistrationResponse) => {
  switch (reg.registrationType) {
    case ApplicationType.PLATFORM:
      return (reg as PlatformRegistrationResp).businessDetails?.legalName || '-'
    case ApplicationType.STRATA_HOTEL:
      return (reg as StrataHotelRegistrationResp).businessDetails?.legalName || '-'
    default: // Host
      return displayContactFullName((reg as HostRegistrationResp).primaryContact) || '-'
  }
}

// Strata location has different interface than the ConnectFormAddressDisplay accepts
const mapStrataAddress = (address: ApiAddress): ConnectAddress | string => {
  return !isEmpty(address)
    ? {
        street: address.address,
        streetAdditional: address.addressLineTwo,
        city: address.city,
        region: address.province,
        postalCode: address.postalCode,
        country: address.country,
        locationDescription: address.locationDescription
      }
    : '-'
}

const getPropertyAddressColumn = (app: HousApplicationResponse) => {
  switch (app.registration.registrationType) {
    case ApplicationType.HOST:
      return app.header.registrationAddress || (app.registration as ApiHostApplication).unitAddress || '-'
    case ApplicationType.STRATA_HOTEL:
      return mapStrataAddress((app.registration as ApiBaseStrataApplication).strataHotelDetails.location)
    default: // platform
      return (app.registration as ApiBasePlatformApplication).businessDetails.mailingAddress || '-'
  }
}

const getPropertyAddressColumnForRegistration = (reg: HousRegistrationResponse) => {
  switch (reg.registrationType) {
    case ApplicationType.PLATFORM:
      return (reg as PlatformRegistrationResp).businessDetails?.mailingAddress || '-'
    case ApplicationType.STRATA_HOTEL: {
      const location = (reg as StrataHotelRegistrationResp).strataHotelDetails?.location
      return location ? mapStrataAddress(location) : '-'
    }
    default:
      return reg.unitAddress || '-'
  }
}

const getAdjudicatorColumn = (header: ApiRegistrationHeader | ApplicationHeader) => {
  return header.assignee?.username || '-'
}

/**
 * Get the display text for the registration status
 * @param status - The registration status
 * @returns The display text for the registration status
 */
const getRegistrationStatusDisplay = (status: RegistrationStatus | undefined): string => {
  if (!status) {
    return ''
  }
  return t(`registrationStatus.${status}`)
}

// get the icon for the registration status
const getRegistrationStatusIcon = (status: RegistrationStatus | undefined): string => {
  return status === RegistrationStatus.ACTIVE ? 'i-mdi-check-circle' : 'i-mdi-close-circle'
}

// get the icon color for the registration status
const getRegistrationStatusIconColor = (status: RegistrationStatus | undefined): string => {
  return status === RegistrationStatus.ACTIVE ? 'text-green-700' : 'text-red-600'
}

/**
 * Get the display text for the registration NOC status
 * @param nocStatus - The registration NOC status
 * @returns The display text for the NOC status
 */
const getRegistrationNocStatusDisplay = (nocStatus: RegistrationNocStatus | undefined): string => {
  if (!nocStatus) {
    return ''
  }
  return t(`registrationNocStatus.${nocStatus}`)
}

const getRequirementsColumn = (app: HousApplicationResponse) => {
  let result = ''
  let listingSize = ''
  switch (app.registration.registrationType) {
    case ApplicationType.HOST:
      result = isEmpty((app.registration as ApiHostApplication).strRequirements)
        ? t('page.dashboardList.requirements.host.none')
        : getHostPrRequirements((app.registration as ApiHostApplication))
      break
    case ApplicationType.STRATA_HOTEL:
      result = '-'
      break
    default:
      listingSize = (app.registration as ApiBasePlatformApplication).platformDetails.listingSize
      result = t(`page.dashboardList.requirements.platform.${listingSize}`)
  }
  if (result.startsWith('page.dashboardList.requirements.platform.') ||
    result.startsWith('page.dashboardList.requirements.host.')) {
    result = t('page.dashboardList.requirements.invalid')
  }
  return result
}

/** Application statuses that mean a renewal was completed (registration was renewed) */
const RENEWAL_APPROVED_STATUSES = new Set<ApplicationStatus>([
  ApplicationStatus.FULL_REVIEW_APPROVED,
  ApplicationStatus.PROVISIONALLY_APPROVED,
  ApplicationStatus.PROVISIONAL_REVIEW,
  ApplicationStatus.AUTO_APPROVED
])

/** Check if a registration has been renewed. Draft renewals are ignored (Renewals in progress). */
const hasBeenRenewed = (reg: HousRegistrationResponse): boolean => {
  const applications = reg.header?.applications ?? []
  return applications.some(
    app =>
      app.applicationType === 'renewal' &&
      app.applicationStatus &&
      RENEWAL_APPROVED_STATUSES.has(app.applicationStatus as ApplicationStatus)
  )
}

const getConditionsColumnForRegistration = (reg: HousRegistrationResponse) => {
  let result = ''
  let listingSize = ''
  switch (reg.registrationType) {
    case ApplicationType.HOST: {
      const hostReg = reg as HostRegistrationResp
      const requirements = []

      // Use strRequirements from application as primary source (most reliable)
      // Fall back to unitDetails for backwards compatibility
      const prRequired = hostReg.strRequirements?.isPrincipalResidenceRequired ?? hostReg.unitDetails?.prRequired
      const blRequired = hostReg.strRequirements?.isBusinessLicenceRequired ?? hostReg.unitDetails?.blRequired
      const isStrProhibited = hostReg.strRequirements?.isStrProhibited

      if (prRequired) {
        requirements.push(t('page.dashboardList.requirements.host.pr'))
      }
      if (blRequired) {
        requirements.push(t('page.dashboardList.requirements.host.bl'))
      }
      if (isStrProhibited) {
        requirements.push(t('page.dashboardList.requirements.host.prohibited'))
      }
      if (hostReg.unitDetails?.prExemptReason) {
        requirements.push(t(`page.dashboardList.requirements.host.${hostReg.unitDetails.prExemptReason}`))
      }
      if (hostReg.unitDetails?.strataHotelCategory) {
        requirements.push(t(`strataHotelCategoryReview.${hostReg.unitDetails.strataHotelCategory}`))
      }
      result = requirements.length > 0 ? requirements.join(', ') : t('page.dashboardList.requirements.host.none')
      break
    }
    case ApplicationType.STRATA_HOTEL:
      result = '-'
      break
    default:
      listingSize = (reg as PlatformRegistrationResp).platformDetails?.listingSize || ''
      result = listingSize ? t(`page.dashboardList.requirements.platform.${listingSize}`) : '-'
  }
  if (result.startsWith('page.dashboardList.requirements.platform.') ||
    result.startsWith('page.dashboardList.requirements.host.')) {
    result = t('page.dashboardList.requirements.invalid')
  }
  return result
}

// Set applications table default status (Full Review only) on first visit when status is empty.
// When we have saved state (hasSavedAppState), never apply default so "nothing selected" persists.
const hasAppliedApplicationsStatusDefault = ref(false)
watch(
  () => [isApplicationTab.value, isSplitDashboardTableEnabled.value],
  ([isApp, isEnabled]) => {
    if (
      !hasAppliedApplicationsStatusDefault.value &&
      isApp &&
      isEnabled &&
      !hasSavedAppState() &&
      (!exStore.tableFilters.status || exStore.tableFilters.status.length === 0)
    ) {
      (exStore.tableFilters.status as ApplicationStatus[]).splice(
        0, exStore.tableFilters.status.length, ...exStore.applicationsOnlyStatuses)
      hasAppliedApplicationsStatusDefault.value = true
    }
  },
  { immediate: true }
)

// Reset selected columns to default when switching tabs
watch(
  () => isApplicationTab.value,
  () => {
    selectedColumns.value = [...columns.value]
  }
)

const { data: registrationListResp, status: regStatus } = await useAsyncData(
  'registration-list-resp',
  useDebounceFn(() => {
    // only fetch when on registrations tab
    if (isApplicationTab.value) {
      return Promise.resolve({ applications: [], total: 0, limit: 0, page: 0 })
    }
    return exStore.fetchRegistrations()
  }, 500),
  {
    watch: [
      () => isApplicationTab.value,
      () => exStore.tablePage,
      () => exStore.tableLimit,
      () => exStore.tableFilters.registrationType,
      () => exStore.tableFilters.status,
      () => exStore.tableFilters.requirements,
      () => exStore.tableFilters.registrationNumber,
      () => exStore.tableFilters.searchText
    ],
    default: () => ({ registrations: [], total: 0 }),
    transform: (res: ApiRegistrationListResp) => {
      if (res.registrations.length === 0) {
        return { registrations: [], total: 0 }
      }
      const registrations = res.registrations.map((reg: HousRegistrationResponse) => ({
        id: reg.id,
        registrationNumber: reg.registrationNumber,
        status: reg.status,
        registrationType: t(`registrationType.${reg.registrationType}`),
        requirements: getConditionsColumnForRegistration(reg),
        applicantName: getApplicantNameColumnForRegistration(reg),
        propertyAddress: getPropertyAddressColumnForRegistration(reg),
        localGov: '', // TODO: implement this once API has made the changes
        adjudicator: getAdjudicatorColumn(reg.header),
        hasRenewed: hasBeenRenewed(reg)
      }))

      return { registrations, total: res.total }
    }
  }
)

// text currently matches anything, same as existing examiners app
// cannot combine search and registration type at this point in time - so hacky if/else for the moment

const { data: applicationListResp, status } = await useAsyncData(
  'application-list-resp',
  useDebounceFn(() => {
    // only fetch when on applications tab
    if (!isApplicationTab.value) {
      return Promise.resolve({ applications: [], total: 0, limit: 0, page: 0 })
    }
    return exStore.fetchApplications()
  }, 500),
  {
    watch: [
      () => isApplicationTab.value,
      () => exStore.tableLimit,
      () => exStore.tablePage,
      () => exStore.tableFilters.registrationType,
      () => exStore.tableFilters.status,
      () => exStore.tableFilters.registrationNumber,
      () => exStore.tableFilters.searchText,
      () => exStore.tableFilters.adjudicator,
      () => exStore.tableFilters.requirements
    ],
    // deep: true, watch: [() => exStore.tableFilters] // can do this once the rest of the table filters are added
    default: () => ({ applications: [], total: 0 }),
    transform: (res: ApiApplicationsListResp) => {
      if (!res.applications.length) {
        return { applications: [], total: 0 }
      }

      const applications = res.applications.map((app: HousApplicationResponse) => ({
        applicationNumber: app.header.applicationNumber,
        registrationNumber: app.header.registrationNumber,
        registrationId: app.header.registrationId,
        applicationType: app.header?.applicationType,
        registrationType: t(`registrationType.${app.registration.registrationType}`),
        requirements: getRequirementsColumn(app),
        applicantName: getApplicantNameColumn(app),
        propertyAddress: getPropertyAddressColumn(app),
        status: app.header.registrationStatus ? app.header.examinerStatus : app.header.hostStatus,
        registrationStatus: app.header.registrationStatus,
        registrationNocStatus: app.header.registrationNocStatus,
        submissionDate: app.header.applicationDateTime,
        lastModified: getLastStatusChangeColumn(app.header),
        adjudicator: getAdjudicatorColumn(app.header)
      }))

      return { applications, total: res.total }
    }
  }
)

const applicationOrRegistrationList = computed(() => {
  if (!isSplitDashboardTableEnabled.value) {
    return applicationListResp.value
  }
  return isApplicationTab.value ? applicationListResp.value : registrationListResp.value
})

// reset page when filters change
watch(
  () => exStore.tableFilters,
  () => {
    exStore.tablePage = 1
  },
  { deep: true }
)

// TODO: set to constant instead of computed when table filters are done
const columns = computed(() => {
  const sortable = enableTableFilters.value

  if (isSplitDashboardTableEnabled.value) {
    return [
      {
        key: 'registrationNumber',
        label: t(isApplicationTab.value
          ? 'page.dashboardList.columns.applicationNumberAlt'
          : 'page.dashboardList.columns.registrationNumberAlt'),
        sortable
      },
      { key: 'status', label: t('page.dashboardList.columns.status'), sortable },
      { key: 'registrationType', label: t('page.dashboardList.columns.registrationType'), sortable },
      { key: 'requirements', label: t('page.dashboardList.columns.conditions'), sortable },
      { key: 'applicantName', label: t('page.dashboardList.columns.hostName'), sortable },
      { key: 'propertyAddress', label: t('page.dashboardList.columns.propertyAddress'), sortable },
      { key: 'localGov', label: 'Local Government', sortable },
      { key: 'adjudicator', label: t('page.dashboardList.columns.adjudicator'), sortable }
    ]
  } else {
    return [
      { key: 'registrationNumber', label: t('page.dashboardList.columns.registrationNumber'), sortable },
      { key: 'registrationType', label: t('page.dashboardList.columns.registrationType'), sortable },
      { key: 'requirements', label: t('page.dashboardList.columns.requirements'), sortable },
      { key: 'applicantName', label: t('page.dashboardList.columns.applicantName'), sortable },
      { key: 'propertyAddress', label: t('page.dashboardList.columns.propertyAddress'), sortable },
      { key: 'submissionDate', label: t('page.dashboardList.columns.submissionDate'), sortable },
      { key: 'status', label: t('page.dashboardList.columns.status'), sortable },
      { key: 'lastModified', label: 'Last Modified', sortable },
      { key: 'adjudicator', label: t('page.dashboardList.columns.adjudicator'), sortable }
    ]
  }
})

const selectedColumns = ref([...columns.value])
const columnsTable = computed(() => columns.value.filter(column => selectedColumns.value.includes(column)))
const sort = ref<TableSort>({ column: 'submissionDate', direction: 'asc' as const })

async function handleRowSelect (row: any) {
  // Fix: Filter Input Double Click Event Propagation
  // Handle applications
  if (row.applicationNumber) {
    status.value = 'pending'
    await navigateTo(localePath(`${RoutesE.EXAMINE}/${row.applicationNumber}`))
    return
  }
  // Handle registrations - preserve tab state in query parameter
  if (row.id) {
    regStatus.value = 'pending'
    const currentTab = isApplicationTab.value ? 'applications' : 'registrations'
    await navigateTo(localePath(`${RoutesE.REGISTRATION}/${row.id}?returnTab=${currentTab}`))
  }
}

async function goToRegistration (registrationId: string) {
  regStatus.value = 'pending'
  const currentTab = isApplicationTab.value ? 'applications' : 'registrations'
  await navigateTo(localePath(`${RoutesE.REGISTRATION}/${registrationId}?returnTab=${currentTab}`))
}

function handleColumnSort (column: string) {
  sort.value = {
    column,
    direction:
      sort.value.column === column
        ? sort.value.direction === 'asc'
          ? 'desc'
          : 'asc'
        : 'desc'
  }
}

// Limit status options to the active table to prevent mixed-status filters.
const applicationStatusOptions: {
  label: string,
  value: any,
  disabled?: boolean,
  childStatuses?: any[]
}[] = [
  {
    label: 'Open',
    value: 'OPEN',
    childStatuses: [
      ApplicationStatus.FULL_REVIEW,
      ApplicationStatus.NOC_PENDING,
      ApplicationStatus.NOC_EXPIRED
    ]
  },
  { label: 'Full Review', value: ApplicationStatus.FULL_REVIEW },
  { label: 'NOC - Pending', value: ApplicationStatus.NOC_PENDING },
  { label: 'NOC - Expired', value: ApplicationStatus.NOC_EXPIRED },
  { label: 'Closed', value: ApplicationStatus.DECLINED },
  {
    label: 'Not Submitted',
    value: 'NOT_SUBMITTED',
    childStatuses: [
      ApplicationStatus.PAYMENT_DUE,
      ApplicationStatus.DRAFT
    ]
  },
  { label: 'Payment Due', value: ApplicationStatus.PAYMENT_DUE },
  { label: 'Draft', value: ApplicationStatus.DRAFT }
]

const registrationStatusOptions: { label: string; value: any; disabled?: boolean }[] = [
  { label: 'Registration Status', value: undefined, disabled: true },
  { label: 'Active', value: RegistrationStatus.ACTIVE },
  { label: 'Suspended', value: RegistrationStatus.SUSPENDED },
  { label: 'Cancelled', value: RegistrationStatus.CANCELLED },
  { label: 'Expired', value: RegistrationStatus.EXPIRED }
]

const statusFilterOptions = computed((): { label: string; value: any; disabled?: boolean }[] => {
  // Old dashboard: show both arrays combined
  if (!isSplitDashboardTableEnabled.value) {
    return [...applicationStatusOptions, ...registrationStatusOptions]
  }

  // New dashboard: show application statuses on application tab, registration statuses otherwise
  return isApplicationTab.value ? applicationStatusOptions : registrationStatusOptions
})

// Update query parameter when tab changes to persist state
const updateTabQuery = (isApp: boolean) => {
  const query = { ...route.query }
  if (isApp) {
    query.tab = 'applications'
  } else {
    query.tab = 'registrations'
  }
  router.replace({ query })
}

function clearAllFilters () {
  if (isSplitDashboardTableEnabled.value) {
    if (isApplicationTab.value) {
      exStore.resetFiltersToApplicationsDefault()
    } else {
      exStore.resetFiltersToRegistrationsDefault()
    }
  } else {
    exStore.resetFilters()
  }
}

const tabLinks = computed(() => [
  {
    label: t('label.newApplicationsTab'),
    click: () => {
      isApplicationTab.value = true
      updateTabQuery(true)
    },
    active: isApplicationTab.value
  },
  {
    label: t('label.registrationsAndRenewalsTab'),
    click: () => {
      isApplicationTab.value = false
      updateTabQuery(false)
    },
    active: !isApplicationTab.value
  }
])

</script>
<template>
  <div
    id="dashboard-page"
    class="flex grow flex-col space-y-6 py-6"
    data-testid="examiner-dashboard-page"
  >
    <h1>{{ $t('label.search') }}</h1>

    <UHorizontalNavigation
      v-if="isSplitDashboardTableEnabled"
      :links="tabLinks"
      :ui="{
        wrapper: 'w-min',
        active: 'font-semibold',
        inactive: 'hover:text',
        base: 'rounded focus-visible:ring-white hover:before:bg-transparent py-4 px-8'
      }"
      data-testid="application-and-registrations-tabs"
    />

    <ConnectPageSection
      :aria-label="$t('label.applicationListSectionAria', { count: applicationOrRegistrationList?.total || 0 })"
    >
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3 text-gray-900">
          <div class="flex flex-wrap items-center gap-3">
            <UInput
              v-model="exStore.tableFilters.searchText"
              :placeholder="$t(`label.${isApplicationTab ? 'findInApplication' : 'findInRegistration'}`)"
              :aria-label="$t(`label.${isApplicationTab ? 'findInApplication' : 'findInRegistration'}`)"
              color="white"
              size="sm"
              trailing
              icon="i-mdi-search"
              :ui="{
                icon: {
                  base: 'text-bcGovColor-activeBlue',
                  trailing: {
                    padding: {
                      sm: 'pr-2'
                    }
                  }
                },
              }"
            />
            <ConnectI18nHelper
              class="text-sm"
              translation-path="label.resultsInTable"
              :count="applicationOrRegistrationList?.total || 0"
            />
            <UButton
              :label="$t('label.clearAllFilters')"
              icon="i-mdi-close"
              variant="link"
              :padded="false"
              :ui="{ gap: { sm: 'gap-x-1' } }"
              @click="clearAllFilters"
            />
          </div>
          <div class="flex flex-wrap items-center gap-3 text-gray-900">
            <UPagination
              v-if="applicationOrRegistrationList.total > exStore.tableLimit"
              v-model="exStore.tablePage"
              :page-count="exStore.tableLimit"
              size="lg"
              :total="applicationOrRegistrationList?.total || 0"
              :ui="{
                base: 'h-10',
                default: {
                  activeButton: { class: 'rounded' }
                }
              }"
              data-testid="applications-pagination"
            />
            <div class="flex items-center gap-2">
              <span
                class="text-sm"
              >{{ $t('label.tableLimitDisplay') }}</span>
              <USelectMenu
                v-model="exStore.tableLimit"
                value-attribute="value"
                :options="[
                  {label: '25', value: 25 },
                  {label: '50', value: 50 },
                  {label: '75', value: 75 },
                  {label: '100', value: 100 },
                ]"
              >
                <template #default="{ open }">
                  <UButton
                    variant="select_menu_trigger"
                    class="h-10 flex-1 justify-between bg-white"
                  >
                    {{ exStore.tableLimit }}
                    <UIcon
                      name="i-mdi-caret-down"
                      class="size-5 shrink-0 text-gray-700 transition-transform"
                      :class="[open && 'rotate-180']"
                    />
                  </UButton>
                </template>
              </USelectMenu>
            </div>
            <USelectMenu
              v-slot="{ open }"
              v-model="selectedColumns"
              :options="columns"
              multiple
              :ui-menu="{ option: { base: 'w-[230px]' } }"
              :ui="{ trigger: 'flex items-center w-full' }"
            >
              <UButton
                color="white"
                class="h-10 flex-1 justify-between text-gray-700"
                :aria-label="$t('btn.colsToShow.aria', { count: selectedColumns.length })"
              >
                <span>{{ $t('btn.colsToShow.label') }}</span>

                <UIcon
                  name="i-mdi-caret-down"
                  class="size-5 text-gray-700 transition-transform"
                  :class="[open && 'rotate-180']"
                />
              </UButton>
            </USelectMenu>
          </div>
        </div>
      </template>
      <UTable
        ref="tableRef"
        v-model:sort="sort"
        :columns="columnsTable"
        :rows="isApplicationTab ? applicationListResp.applications : registrationListResp.registrations"
        :loading="isApplicationTab ? status === 'pending' : regStatus === 'pending'"
        sort-mode="manual"
        :empty-state="{
          icon: '',
          label: 'No matching applications or registrations found.'
        }"
        :ui="{
          wrapper: 'relative bg-white overflow-auto h-auto min-h-[calc(50svh)] max-h-[calc(74svh)]',
          thead: 'sticky top-0 bg-white z-10 shadow-sm',
          th: {
            base: 'h-[72px]',
            padding: enableTableFilters ? 'px-0 py-0' : 'px-2 py-3'
          },
          td: {
            base: 'whitespace-normal max-w-96 align-middle h-[72px]',
            padding: 'py-2 pl-2 pr-4',
            color: 'text-bcGovColor-midGray',
            font: '',
            size: 'text-sm',
          }
        }"
        data-testid="applications-table"
        @select="handleRowSelect"
      >
        <template v-if="enableTableFilters" #registrationNumber-header="{ column }">
          <TableHeaderInput
            v-model="exStore.tableFilters.registrationNumber"
            :column
            :sort
            @sort="handleColumnSort(column.key)"
          />
        </template>

        <template v-if="enableTableFilters" #registrationType-header="{ column }">
          <TableHeaderSelect
            v-model="exStore.tableFilters.registrationType"
            :column
            :sort
            :options="[
              { label: 'Host', value: ApplicationType.HOST },
              { label: 'Strata', value: ApplicationType.STRATA_HOTEL },
              { label: 'Platform', value: ApplicationType.PLATFORM }
            ]"
            @sort="handleColumnSort(column.key)"
          />
        </template>

        <template v-if="enableTableFilters" #requirements-header="{ column }">
          <TableHeaderSelect
            v-model="exStore.tableFilters.requirements"
            :column
            :sort
            :options="requirementOptions"
            :disable="!enableRequirementFilter"
            @sort="handleColumnSort(column.key)"
          />
        </template>

        <template v-if="enableTableFilters" #applicantName-header="{ column }">
          <TableHeaderInput
            v-model="exStore.tableFilters.applicantName"
            :column
            :sort
            :disable="!enableApplicantFilter"
            @sort="handleColumnSort(column.key)"
          />
        </template>

        <template v-if="enableTableFilters" #propertyAddress-header="{ column }">
          <TableHeaderInput
            v-model="exStore.tableFilters.propertyAddress"
            :column
            :sort
            :disable="!enablePropertyAddressFilter"
            @sort="handleColumnSort(column.key)"
          />
        </template>

        <template v-if="enableTableFilters" #status-header="{ column }">
          <TableHeaderSelect
            v-model="exStore.tableFilters.status"
            :column
            :sort
            :default="[]"
            class="break-words"
            :options="statusFilterOptions"
            @sort="handleColumnSort(column.key)"
          />
        </template>

        <template v-if="enableTableFilters" #submissionDate-header="{ column }">
          <TableHeaderDateRange
            v-model="exStore.tableFilters.submissionDate"
            :column
            :sort
            :ranges="[
              { label: 'Today', duration: { days: 0 } },
              { label: '7 days', duration: { days: 7 } },
              { label: '30 days', duration: { days: 30 } },
              { label: '90 days', duration: { days: 90 } },
              { label: '1 year', duration: { years: 1 } },
              { label: '2 years', duration: { years: 3 } },
              { label: '5 years', duration: { years: 5 } }
            ]"
            :disable="!enableSubmissionDateFilter"
            @sort="handleColumnSort(column.key)"
          />
        </template>

        <template v-if="enableTableFilters" #lastModified-header="{ column }">
          <TableHeaderDateRange
            v-model="exStore.tableFilters.lastModified"
            :column
            :sort
            :ranges="[
              { label: 'Today', duration: { days: 0 } },
              {
                label: 'Yesterday',
                duration: { start: sub(new Date(), { days: 1 }), end: sub(new Date(), { days: 1 }) }
              },
              { label: '2 days', duration: { days: 2 } },
              { label: '7 days', duration: { days: 7 } },
              { label: '30 days', duration: { days: 30 } }
            ]"
            :disable="!enableLastModifiedFilter"
            @sort="handleColumnSort(column.key)"
          />
        </template>

        <template v-if="enableTableFilters" #localGov-header="{ column }">
          <TableHeaderInput
            v-model="exStore.tableFilters.localGov"
            :column
            :sort
            @sort="handleColumnSort(column.key)"
          />
        </template>

        <template v-if="enableTableFilters" #adjudicator-header="{ column }">
          <TableHeaderInput
            v-model="exStore.tableFilters.adjudicator"
            :column
            :sort
            @sort="handleColumnSort(column.key)"
          />
        </template>

        <template #registrationNumber-data="{ row }">
          <div
            v-if="isSplitDashboardTableEnabled"
          >
            <div v-if="isApplicationTab">
              {{ row.applicationNumber }}
            </div>
            <div v-else class="flex flex-col">
              <span>{{ row.registrationNumber }}</span>
              <UBadge
                v-if="row.hasRenewed"
                :label="t('label.renewal')"
                color="primary"
                variant="solid"
                class="mt-1 w-fit text-xs font-bold uppercase"
                data-testid="renewal-badge"
              />
            </div>
            <UButton
              v-if="row.registrationNumber && isApplicationTab"
              icon="i-mdi-check-circle"
              variant="link"
              :padded="false"
              :ui="{ gap: { sm: 'gap-x-1' }, icon: { base: 'text-green-700 text-xs' } }"
              class="text-sm"
              @click="goToRegistration(row.registrationId)"
            >
              {{ row.registrationNumber }}
            </UButton>
          </div>
          <div v-else class="flex flex-col">
            <span>{{ row.applicationNumber }}</span>
            <UButton
              v-if="row.registrationNumber"
              icon="i-mdi-check-circle"
              variant="link"
              :padded="false"
              :ui="{ gap: { sm: 'gap-x-1' }, icon: { base: 'text-green-700 text-xs' } }"
              class="text-sm"
              @click="goToRegistration(row.registrationId)"
            >
              {{ row.registrationNumber }}
            </UButton>
            <UBadge
              v-if="row.applicationType === 'renewal'"
              :label="t('label.renewal')"
              color="primary"
              variant="solid"
              class="mt-1 w-fit text-xs font-bold uppercase"
              data-testid="renewal-badge"
            />
          </div>
        </template>

        <template #propertyAddress-data="{ row }">
          <ConnectFormAddressDisplay
            :address="row.propertyAddress"
            omit-country
          />
        </template>

        <template #submissionDate-data="{ row }">
          <div class="flex flex-col">
            <span>{{ dateToStringPacific(row.submissionDate) }}</span>
            <span>{{ dateToString(row.submissionDate, 'a', true) }}</span>
          </div>
        </template>

        <template #lastModified-data="{ row }">
          <div class="flex flex-col">
            <span>{{ dateToStringPacific(row.lastModified) }}</span>
            <span>{{ dateToString(row.lastModified, 'a', true) }}</span>
          </div>
        </template>

        <template #status-data="{ row }">
          <div class="flex flex-col">
            <span>{{ row.status }}</span>
            <!-- NOC Status takes priority: show when registration is ACTIVE and has a NOC status -->
            <UButton
              v-if="row.registrationStatus === 'ACTIVE' && row.registrationNocStatus"
              icon="i-mdi-alert-circle"
              variant="link"
              :padded="false"
              :ui="{
                gap: { sm: 'gap-x-1' },
                icon: { base: 'text-orange-500 text-xs' }
              }"
              class="text-sm"
              @click.stop="goToRegistration(row.registrationId)"
            >
              {{ getRegistrationNocStatusDisplay(row.registrationNocStatus) }}
            </UButton>
            <!-- Registration Status: show when no NOC status to display -->
            <UButton
              v-else-if="row.registrationStatus && row.registrationNumber"
              :icon="getRegistrationStatusIcon(row.registrationStatus)"
              variant="link"
              :padded="false"
              :ui="{
                gap: { sm: 'gap-x-1' },
                icon: { base: `${getRegistrationStatusIconColor(row.registrationStatus)} text-xs` }
              }"
              class="text-sm"
              @click.stop="goToRegistration(row.registrationId)"
            >
              {{ getRegistrationStatusDisplay(row.registrationStatus) }}
            </UButton>
          </div>
        </template>
      </UTable>
    </ConnectPageSection>
  </div>
</template>
<style scoped>
.page-limit-select {
  height: 42px !important;
  background-color: white !important;
}
</style>
