<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const accountStore = useConnectAccountStore()
const strrModal = useStrrModals()
const { deleteApplication, getAccountRegistrations, getAccountApplications } = useStrrApi()
const { isDashboardTableSortingEnabled, isNewDashboardEnabled } = useHostFeatureFlags()

// Redirect to old dashboard if feature flag is not enabled
if (!isNewDashboardEnabled.value) {
  await navigateTo(localePath('/dashboard'))
}

// Applications list setup
const applicationsLimit = ref(6)
const applicationsPage = ref(1)

// Define allowed statuses for applications in progress
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

// Registrations list setup
const registrationsLimit = ref(6)
const registrationsPage = ref(1)

useHead({
  title: t('page.dashboardList.title')
})

definePageMeta({
  middleware: ['auth', 'check-tos', 'require-account']
})

setBreadcrumbs([
  {
    label: t('label.bcregDash'),
    to: useRuntimeConfig().public.registryHomeURL + 'dashboard',
    appendAccountId: true,
    external: true
  },
  { label: t('page.dashboardList.h1') }
])

// Helper to create sortable column
const createColumn = (key: string, label: string, sortable = true) => ({
  key,
  label,
  ...(sortable && { sortable: isDashboardTableSortingEnabled.value })
})

const commonColumns = [
  createColumn('number', t('label.number')),
  createColumn('status', t('label.status')),
  createColumn('address', t('label.address')),
  createColumn('localGovernment', t('label.localGovernment'))
]

const applicationsColumns = [
  ...commonColumns,
  createColumn('dateSubmitted', t('label.dateSubmitted')),
  createColumn('actions', t('label.actions'), false)
]

const registrationsColumns = [
  ...commonColumns,
  createColumn('expiryDate', t('label.expirationDate')),
  createColumn('actions', t('label.actions'), false)
]

// Fetch Applications
const { data: applicationsResp, status: applicationsStatus, refresh: refreshApplications } = await useAsyncData(
  'host-applications-list',
  async () => {
    const resp = await getAccountApplications<HostApplicationResp>(
      applicationsLimit.value,
      applicationsPage.value,
      ApplicationType.HOST,
      allowedStatuses,
      undefined,
      undefined,
      true, // includeDraftRegistration
      false // includeDraftRenewal
    )
    if (!resp) {
      return { applications: [], total: 0, filteredCount: 0 }
    }
    return {
      applications: resp.applications,
      total: resp.total,
      filteredCount: resp.total
    }
  },
  {
    watch: [() => accountStore.currentAccount.id, applicationsLimit, applicationsPage],
    default: () => ({ applications: [], total: 0, filteredCount: 0 })
  }
)

// Track cumulative filtered count across all pages
const totalFilteredApplications = ref(0)
watch(applicationsResp, (newVal) => {
  if (newVal) {
    totalFilteredApplications.value = newVal.filteredCount
  }
}, { immediate: true })

// Fetch Registrations
const { data: registrationsResp, status: registrationsStatus } = await useAsyncData(
  'host-registrations-list',
  async () => {
    const resp = await getAccountRegistrations<ApiRegistrationResp>(
      undefined,
      ApplicationType.HOST,
      registrationsLimit.value,
      registrationsPage.value
    )
    // Handle both array and object response formats
    if (Array.isArray(resp)) {
      return { registrations: resp, total: resp.length }
    }
    return { registrations: resp?.registrations || [], total: resp?.total || 0 }
  },
  {
    watch: [() => accountStore.currentAccount.id, registrationsLimit, registrationsPage],
    default: () => ({ registrations: [], total: 0 })
  }
)

// Map applications list
const mapApplicationsList = () => {
  if (!applicationsResp.value?.applications) {
    return []
  }
  return applicationsResp.value.applications.map((app: any) => {
    const displayAddress = app.header.registrationAddress || app.registration.unitAddress
    return {
      number: app.header.applicationNumber,
      status: app.header.hostStatus,
      address: displayAddress,
      localGovernment: app.registration?.strRequirements?.organizationNm || t('text.notAvailable'),
      dateSubmitted: app.header.applicationDateTime,
      applicationNumber: app.header.applicationNumber
    }
  })
}

const hasRenewalDraft = (registration: any): boolean => {
  if (!registration?.header?.applications) {
    return false
  }
  return registration.header.applications.some((app: any) =>
    app.applicationType === 'renewal' && app.applicationStatus === 'DRAFT'
  )
}

const hasRenewalInProgress = (registration: any): boolean => {
  if (!registration?.header?.applications) {
    return false
  }
  return registration.header.applications.some((app: any) =>
    app.applicationType === 'renewal' &&
    ['UNDER_REVIEW', 'ADDITIONAL_INFO_REQUESTED', 'PROVISIONAL_REVIEW'].includes(app.applicationStatus)
  )
}

const getLatestApplicationNumber = (registration: any): string => {
  if (!registration?.header?.applications || registration.header.applications.length === 0) {
    return registration.registrationNumber
  }
  return registration.header.applications[0].applicationNumber
}

const isExpiryDateCritical = (expiryDate: string): boolean => {
  if (!expiryDate) {
    return false
  }
  const expiry = new Date(expiryDate)
  const today = new Date()
  const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntilExpiry <= 40 || daysUntilExpiry < 0
}

const mapRegistrationsList = () => {
  if (!registrationsResp.value?.registrations) {
    return []
  }
  return registrationsResp.value.registrations.map((registration: any) => {
    const displayAddress = registration.unitAddress
    return {
      number: registration.registrationNumber,
      status: registration.header?.hostStatus || registration.status,
      address: displayAddress,
      localGovernment: registration.unitDetails?.jurisdiction || t('text.notAvailable'),
      expiryDate: registration.expiryDate,
      isExpiryCritical: isExpiryDateCritical(registration.expiryDate),
      hasRenewalDraft: hasRenewalDraft(registration),
      hasRenewalInProgress: hasRenewalInProgress(registration),
      latestApplicationNumber: getLatestApplicationNumber(registration),
      registrationId: registration.id
    }
  })
}

const applicationsList = ref(mapApplicationsList())
watch(applicationsResp, () => { applicationsList.value = mapApplicationsList() })

const registrationsList = ref(mapRegistrationsList())
watch(registrationsResp, () => { registrationsList.value = mapRegistrationsList() })

// Common UI configurations
const tableUI = {
  wrapper: 'relative overflow-x-auto h-[512px]',
  thead: 'sticky top-0 bg-white z-10',
  th: { padding: 'p-2' },
  td: {
    base: 'whitespace-normal max-w-96 align-top',
    padding: 'p-4',
    color: 'text-bcGovColor-midGray',
    font: '',
    size: 'text-sm'
  }
}

const paginationUI = {
  base: 'h-[42px]',
  default: {
    activeButton: { class: 'rounded' }
  }
}

// Delete draft application
const deleting = ref(false)
async function deleteDraft (row: any) {
  try {
    deleting.value = true
    row.class = 'bg-red-50 animate-pulse'
    row.disabled = true
    await Promise.all([
      new Promise(resolve => setTimeout(resolve, 500)),
      await deleteApplication(row.applicationNumber)
    ])
  } catch (e) {
    logFetchError(e, `Error deleting application ${row.applicationNumber}`)
    strrModal.openAppSubmitError(e)
  } finally {
    refreshApplications()
    deleting.value = false
  }
}

// Navigate to application
async function handleApplicationSelect (row: any) {
  if (row.status === 'Draft') {
    await navigateTo(localePath('/application?applicationId=' + row.applicationNumber))
  } else {
    await navigateTo(localePath('/dashboard/' + row.applicationNumber))
  }
}

// Navigate to registration (using latest application)
async function handleRegistrationSelect (row: any) {
  await navigateTo(localePath('/dashboard/' + row.latestApplicationNumber))
}
</script>

<template>
  <div class="space-y-8 py-8 sm:space-y-10 sm:py-10">
    <div class="space-y-4">
      <ConnectTypographyH1 :text="$t('page.dashboardList.h1')" />
      <p>{{ $t('page.dashboardList.subtitle') }}</p>
      <UButton
        :label="$t('modal.help.registerStr.triggerBtn')"
        :padded="false"
        icon="i-mdi-help-circle-outline"
        variant="link"
        @click="strrModal.openHelpRegisterModal()"
      />
    </div>

    <div class="space-y-4">
      <UButton
        :label="$t('btn.registerAStr')"
        icon="i-mdi-plus"
        :to="localePath('/application')"
      />

      <!-- Registrations Table -->
      <DashboardRegistrationsTable
        v-model:page="registrationsPage"
        :registrations-resp="registrationsResp"
        :registrations-limit="registrationsLimit"
        :pagination-ui="paginationUI"
        :registrations-columns="registrationsColumns"
        :registrations-list="registrationsList"
        :registrations-status="registrationsStatus"
        :table-ui="tableUI"
        @select="handleRegistrationSelect"
      />

      <!-- Applications in Progress Table -->
      <DashboardApplicationsTable
        v-model:page="applicationsPage"
        :total-filtered-applications="totalFilteredApplications"
        :applications-limit="applicationsLimit"
        :pagination-ui="paginationUI"
        :applications-columns="applicationsColumns"
        :applications-list="applicationsList"
        :applications-status="applicationsStatus"
        :table-ui="tableUI"
        :deleting="deleting"
        @select="handleApplicationSelect"
        @delete-draft="deleteDraft"
      />
    </div>
  </div>
</template>
