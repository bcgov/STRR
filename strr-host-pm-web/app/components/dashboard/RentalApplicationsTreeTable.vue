<script setup lang="ts">
import { DateTime } from 'luxon'
import type {
  TreeTableRow,
  RegistrationApplicationSummary
} from '~/interfaces/dashboard-tables'

const { t } = useNuxtApp().$i18n
const localePath = useLocalePath()
const accountStore = useConnectAccountStore()
const permitStore = useHostPermitStore()
const strrModal = useStrrModals()
const { handlePaymentRedirect } = useConnectNav()
const { deleteApplication } = useStrrApi()
const {
  startRenewal,
  resumeRenewalDraft,
  canRenewRegistration
} = useRenewals()

const props = withDefaults(defineProps<{
  initialViewMode?: 'tree' | 'split'
}>(), {
  initialViewMode: 'tree'
})

const emit = defineEmits<{
  'update:viewMode': [mode: 'tree' | 'split']
}>()

// State
const searchText = ref('')
const selectedFilter = ref<'all' | 'rentals' | 'in_progress' | 'action_needed'>('all')
const expandedIds = ref<Set<string>>(new Set())
const deletingAppNumber = ref<string | null>(null)
const connectTreeTableRef = ref()

// Table column definitions
const treeColumns = [
  { key: 'property', label: `${t('label.number')} / ${t('label.name')}`, class: 'w-[32%] min-w-[270px]' },
  { key: 'address', label: t('label.address'), class: 'w-[26%]' },
  { key: 'status', label: t('label.status'), class: 'w-[16%]' },
  { key: 'date', label: `${t('label.expirationDate')} / ${t('label.dateSubmitted')}`, class: 'w-[14%]' },
  { key: 'actions', label: t('label.actions'), class: 'w-[12%] min-w-[140px]', sortable: false }
]

const tableUI = {
  wrapper: 'relative overflow-x-auto min-h-[380px]',
  thead: 'sticky top-0 bg-white z-10 border-b border-gray-200',
  th: { padding: 'p-3', font: 'font-bold', color: 'text-gray-900', size: 'text-sm' },
  td: {
    base: 'whitespace-normal align-middle',
    padding: 'p-3.5',
    color: 'text-bcGovColor-midGray',
    size: 'text-sm'
  }
}

// Helper functions for date and expiry calculations
const getRenewalWindowDays = (registrationType?: ApplicationType): number => {
  if (registrationType === ApplicationType.STRATA_HOTEL) {
    return 60
  }
  return 40
}

const getDaysUntilExpiry = (expiryDate?: string): number | null => {
  if (!expiryDate) {
    return null
  }
  const expiry = DateTime.fromISO(expiryDate).setZone('America/Vancouver')
  if (!expiry.isValid) {
    return null
  }
  const today = DateTime.now().setZone('America/Vancouver')
  return Math.floor(expiry.diff(today, 'days').toObject().days ?? 0)
}

const getExpiryState = (registrationType: ApplicationType | undefined, expiryDate: string | undefined): ExpiryState => {
  const daysUntilExpiry = getDaysUntilExpiry(expiryDate)
  if (daysUntilExpiry === null) {
    return ExpiryState.ACTIVE
  }
  if (daysUntilExpiry < 0) {
    return ExpiryState.EXPIRED
  }
  if (daysUntilExpiry <= getRenewalWindowDays(registrationType)) {
    return ExpiryState.EXPIRING_SOON
  }
  return ExpiryState.ACTIVE
}

const hasRenewalDraft = (registration: RegistrationRecord): boolean => {
  if (!registration?.header?.applications) {
    return false
  }
  return registration.header.applications.some((app: RegistrationApplicationSummary) =>
    app.applicationType === 'renewal' && app.applicationStatus === ApplicationStatus.DRAFT
  )
}

const hasRenewalPaymentPending = (registration: RegistrationRecord): boolean => {
  if (!registration?.header?.applications) {
    return false
  }
  return registration.header.applications.some((app: RegistrationApplicationSummary) =>
    app.applicationType === 'renewal' && app.applicationStatus === ApplicationStatus.PAYMENT_DUE
  )
}

const getRenewalDraftApplicationNumber = (registration: RegistrationRecord): string | undefined => {
  if (!registration?.header?.applications) {
    return undefined
  }
  const renewalDraft = registration.header.applications.find((app: RegistrationApplicationSummary) =>
    app.applicationType === 'renewal' && app.applicationStatus === ApplicationStatus.DRAFT
  )
  return renewalDraft?.applicationNumber
}

// Fetch Registrations & Applications from Shared Store (prevents duplicate requests on view switches)
const isTreeLoading = computed(() => Boolean(toValue(permitStore.isDashboardLoading)))

// Fetch initially into store if needed
await permitStore.loadDashboardData?.()

// Debounced search query
watchDebounced(
  [() => accountStore.currentAccount.id, searchText],
  async ([, newSearch], [, oldSearch]) => {
    if (newSearch !== oldSearch) {
      if (newSearch && newSearch.length >= 3) {
        await permitStore.loadDashboardData?.(true, newSearch)
      } else if (oldSearch && oldSearch.length >= 3 && (!newSearch || newSearch.length < 3)) {
        await permitStore.loadDashboardData?.(true)
      }
    }
  },
  { debounce: 400 }
)

// Build the Unified Tree Structure using actual data from the store
const rawTreeItems = computed<TreeTableRow[]>(() => {
  const rawRegs = permitStore.dashboardRegistrations || []
  const rawApps = permitStore.dashboardApplications || []

  // Map of registrations by registrationNumber and id
  const regMap = new Map<string, TreeTableRow>()
  const regIdMap = new Map<number, TreeTableRow>()

  // 1. Process Registrations as root nodes
  const rootRegistrations: TreeTableRow[] = rawRegs.map((reg) => {
    const expiryState = getExpiryState(reg.registrationType, reg.expiryDate)
    const renewalDraftExists = reg.hasRenewalDraft !== undefined
      ? reg.hasRenewalDraft
      : hasRenewalDraft(reg)
    const renewalPaymentPending = reg.hasRenewalPaymentPending !== undefined
      ? reg.hasRenewalPaymentPending
      : hasRenewalPaymentPending(reg)
    const renewalDraftAppNum = reg.hasRenewalDraft !== undefined
      ? (reg.renewalDraftId ?? undefined)
      : getRenewalDraftApplicationNumber(reg)

    const canRenew = canRenewRegistration(reg, expiryState, renewalDraftExists, renewalPaymentPending)

    // Collect any child applications declared directly on the registration header
    const directChildren: TreeTableRow[] = []
    if (reg.header?.applications && Array.isArray(reg.header.applications)) {
      reg.header.applications.forEach((appSummary: RegistrationApplicationSummary) => {
        if (!appSummary.applicationNumber) { return }
        directChildren.push({
          id: `app_${appSummary.applicationNumber}`,
          parentId: `reg_${reg.id}`,
          rowType: 'application',
          number: appSummary.applicationNumber,
          applicationNumber: appSummary.applicationNumber,
          applicationType: appSummary.applicationType || 'registration',
          status: appSummary.applicationStatus,
          statusKey: appSummary.applicationStatus,
          localGovernment: reg.unitDetails?.jurisdiction,
          isChild: true
        })
      })
    }

    const regRow: TreeTableRow = {
      id: `reg_${reg.id}`,
      rowType: 'registration',
      number: reg.registrationNumber,
      nickname: reg.unitAddress?.nickname,
      status: reg.header?.hostStatus || reg.status,
      address: reg.unitAddress,
      localGovernment: reg.unitDetails?.jurisdiction || t('text.notAvailable'),
      expiryDate: reg.expiryDate,
      expiryState,
      hasRenewalDraft: renewalDraftExists,
      renewalDraftApplicationNumber: renewalDraftAppNum,
      canRenew,
      registrationId: reg.id,
      children: directChildren
    }

    if (reg.registrationNumber) {
      regMap.set(reg.registrationNumber, regRow)
    }
    if (reg.id) {
      regIdMap.set(reg.id, regRow)
    }

    return regRow
  })

  // 2. Process Applications
  const standaloneApplications: TreeTableRow[] = []

  rawApps.forEach((app) => {
    const appHeader = app.header
    const appNumber = appHeader?.applicationNumber
    if (!appNumber) { return }

    const linkedRegNumber = appHeader.registrationNumber
    const linkedRegId = appHeader.registrationId
    const targetReg = (linkedRegNumber && regMap.get(linkedRegNumber)) ||
      (linkedRegId && regIdMap.get(linkedRegId))

    if (targetReg) {
      // This application is tied to an existing registration -> add as child
      targetReg.children = targetReg.children || []
      const existingChildIndex = targetReg.children.findIndex(c => c.applicationNumber === appNumber)
      const childRow: TreeTableRow = {
        id: `app_${appNumber}`,
        parentId: targetReg.id,
        rowType: 'application',
        number: appNumber,
        applicationNumber: appNumber,
        applicationType: appHeader.applicationType || 'renewal',
        status: appHeader.hostStatus || appHeader.status,
        statusKey: appHeader.status,
        hostActions: (appHeader.hostActions || []) as HostActions[],
        dateSubmitted: appHeader.applicationDateTime,
        paymentToken: appHeader.paymentToken,
        localGovernment: targetReg.localGovernment,
        isChild: true
      }

      if (existingChildIndex >= 0) {
        targetReg.children[existingChildIndex] = { ...targetReg.children[existingChildIndex], ...childRow }
      } else {
        targetReg.children.push(childRow)
      }
    } else {
      // Standalone application (initial application not yet approved)
      const displayAddress = appHeader.registrationAddress || app.registration?.unitAddress
      standaloneApplications.push({
        id: `app_${appNumber}`,
        rowType: 'standalone_application',
        number: appNumber,
        applicationNumber: appNumber,
        applicationType: appHeader.applicationType || 'registration',
        nickname: app.registration?.unitAddress?.nickname,
        status: appHeader.hostStatus || appHeader.status,
        statusKey: appHeader.status,
        hostActions: (appHeader.hostActions || []) as HostActions[],
        address: displayAddress,
        localGovernment: app.registration?.strRequirements?.organizationNm || t('text.notAvailable'),
        dateSubmitted: appHeader.applicationDateTime,
        paymentToken: appHeader.paymentToken
      })
    }
  })

  return [...rootRegistrations, ...standaloneApplications]
})

// Counts for filter chips
const totalRentalsCount = computed(() =>
  rawTreeItems.value.filter(item => item.rowType === 'registration').length
)

const totalInProgressCount = computed(() =>
  rawTreeItems.value.filter(item =>
    item.rowType === 'standalone_application' ||
    (item.rowType === 'registration' && (item.hasRenewalDraft || item.children?.some(c => c.statusKey !== ApplicationStatus.PAID)))
  ).length
)

const totalActionNeededCount = computed(() =>
  rawTreeItems.value.filter(item =>
    (item.rowType === 'registration' && (item.canRenew || item.hasRenewalDraft || item.expiryState === ExpiryState.EXPIRING_SOON || item.expiryState === ExpiryState.EXPIRED)) ||
    (item.rowType === 'standalone_application' && (item.statusKey === ApplicationStatus.DRAFT || item.statusKey === ApplicationStatus.PAYMENT_DUE))
  ).length
)

// Filtering and Searching
const filteredTreeItems = computed<TreeTableRow[]>(() => {
  let items = rawTreeItems.value

  // 1. Filter by category tabs
  if (selectedFilter.value === 'rentals') {
    items = items.filter(item => item.rowType === 'registration')
  } else if (selectedFilter.value === 'in_progress') {
    items = items.filter(item =>
      item.rowType === 'standalone_application' ||
      (item.rowType === 'registration' && (item.hasRenewalDraft || item.children?.some(c => c.statusKey !== ApplicationStatus.PAID)))
    )
  } else if (selectedFilter.value === 'action_needed') {
    items = items.filter(item =>
      (item.rowType === 'registration' && (item.canRenew || item.hasRenewalDraft || item.expiryState === ExpiryState.EXPIRING_SOON || item.expiryState === ExpiryState.EXPIRED)) ||
      (item.rowType === 'standalone_application' && (item.statusKey === ApplicationStatus.DRAFT || item.statusKey === ApplicationStatus.PAYMENT_DUE))
    )
  }

  // 2. Filter by Search Query
  const query = searchText.value.trim().toLowerCase()
  if (!query) {
    return items
  }

  return items.filter((item) => {
    const matchNumber = item.number.toLowerCase().includes(query)
    const matchNickname = item.nickname?.toLowerCase().includes(query)
    const matchCity = item.address?.city?.toLowerCase().includes(query)
    const matchStreet = `${item.address?.streetNumber || ''} ${item.address?.streetName || ''}`.toLowerCase().includes(query)
    const matchStatus = item.status?.toLowerCase().includes(query)

    // Check if any child application matches
    const childMatches = (item.children || []).some(child =>
      child.number.toLowerCase().includes(query) ||
      child.status?.toLowerCase().includes(query) ||
      child.applicationType?.toLowerCase().includes(query)
    )

    // If a child matches, ensure the parent is automatically expanded!
    if (childMatches) {
      expandedIds.value.add(item.id)
    }

    return matchNumber || matchNickname || matchCity || matchStreet || matchStatus || childMatches
  })
})

// Expand / Collapse All Handlers
const areAllExpanded = computed(() => {
  const parentsWithChildren = filteredTreeItems.value.filter(
    item => item.rowType === 'registration' && item.children && item.children.length > 0
  )
  if (parentsWithChildren.length === 0) { return false }
  return parentsWithChildren.every(item => expandedIds.value.has(item.id))
})

const handleToggleExpandAll = () => {
  if (areAllExpanded.value) {
    expandedIds.value.clear()
  } else {
    filteredTreeItems.value.forEach((item) => {
      if (item.rowType === 'registration' && item.children && item.children.length > 0) {
        expandedIds.value.add(item.id)
      }
    })
  }
}

// Navigation & Actions
const getRegistrationDetailsPath = (registrationNumber: string) =>
  localePath(`/dashboard/registration/${registrationNumber}`)

const getApplicationDetailsPath = (applicationNumber: string) =>
  localePath(`/dashboard/application/${applicationNumber}`)

const handleRegistrationLinkClick = (row: TreeTableRow) => {
  if (row.registrationId) {
    permitStore.selectedRegistrationId = row.registrationId.toString()
  }
}

const handleRenewRegistration = async (row: TreeTableRow) => {
  if (row.registrationId) {
    await startRenewal(row.registrationId)
  }
}

const handleResumeRenewalDraft = async (row: TreeTableRow) => {
  if (row.renewalDraftApplicationNumber) {
    await resumeRenewalDraft(row.renewalDraftApplicationNumber)
  }
}

const handleApplicationSelect = async (row: TreeTableRow) => {
  await navigateTo(localePath(`/application?applicationId=${row.applicationNumber || row.number}`))
}

const handlePayNow = (row: TreeTableRow) => {
  if (row.paymentToken) {
    handlePaymentRedirect(
      row.paymentToken,
      `/dashboard/application/${row.applicationNumber || row.number}`
    )
  }
}

const handleDeleteDraft = async (row: TreeTableRow) => {
  try {
    deletingAppNumber.value = row.number
    await deleteApplication(row.number)
    await permitStore.refreshDashboardData?.()
  } catch (e) {
    strrModal.openAppSubmitError(e)
  } finally {
    deletingAppNumber.value = null
  }
}

// Format Address Helper
const formatAddressLines = (address?: ApiUnitAddress) => {
  if (!address) {
    return { line1: t('text.notAvailable'), line2: '' }
  }
  const unit = address.unitNumber ? `${address.unitNumber}-` : ''
  const street = [address.streetNumber, address.streetName].filter(Boolean).join(' ')
  return {
    line1: `${unit}${street}`.trim() || t('text.notAvailable'),
    line2: address.city || ''
  }
}

const getApplicationTypeBadgeText = (type?: string) => {
  if (type === 'renewal') {
    return t('page.treeTable.renewalApplication')
  }
  return t('page.treeTable.initialApplication')
}
</script>

<template>
  <ConnectPageSection
    data-testid="unified-tree-table-section"
    class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
  >
    <!-- Section Header & Controls -->
    <template #header>
      <div class="space-y-4">
        <!-- Top Toolbar: Title & View Switcher -->
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center space-x-3">
            <div class="rounded-lg bg-bcGovColor-activeBlue/10 p-2 text-bcGovColor-activeBlue">
              <UIcon name="i-mdi-file-tree" class="size-6" />
            </div>
            <div>
              <h2 class="text-xl font-semibold leading-tight text-gray-900">
                {{ $t('page.treeTable.title') }}
              </h2>
              <p class="mt-0.5 text-xs text-gray-500">
                {{ totalRentalsCount }} {{ $t('page.treeTable.filterRentals') }} · {{ totalInProgressCount }} {{ $t('page.treeTable.filterInProgress') }}
              </p>
            </div>
          </div>

          <!-- Controls: Expand All, View Mode Switch -->
          <div class="flex flex-wrap items-center gap-2.5">
            <!-- Expand / Collapse All -->
            <UButton
              size="xs"
              color="gray"
              variant="outline"
              :icon="areAllExpanded ? 'i-mdi-unfold-less-horizontal' : 'i-mdi-unfold-more-horizontal'"
              :label="areAllExpanded ? $t('page.treeTable.collapseAll') : $t('page.treeTable.expandAll')"
              @click="handleToggleExpandAll"
            />

            <!-- View Mode Switcher -->
            <div class="shadow-xs inline-flex rounded-md border border-gray-200 bg-gray-100 p-0.5">
              <button
                type="button"
                class="flex items-center space-x-1 rounded px-2.5 py-1 text-xs font-medium transition-colors"
                :class="props.initialViewMode === 'tree' ? 'bg-white text-bcGovColor-activeBlue shadow-xs' : 'text-gray-600 hover:text-gray-900'"
                @click="emit('update:viewMode', 'tree')"
              >
                <UIcon name="i-mdi-file-tree" class="size-3.5" />
                <span>{{ $t('page.treeTable.viewModeTree') }}</span>
              </button>
              <button
                type="button"
                class="flex items-center space-x-1 rounded px-2.5 py-1 text-xs font-medium transition-colors"
                :class="props.initialViewMode === 'split' ? 'bg-white text-bcGovColor-activeBlue shadow-xs' : 'text-gray-600 hover:text-gray-900'"
                @click="emit('update:viewMode', 'split')"
              >
                <UIcon name="i-mdi-table-split-cell" class="size-3.5" />
                <span>{{ $t('page.treeTable.viewModeSplit') }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Filter Chips and Live Search Bar -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-1">
          <!-- Filter Tabs -->
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              :class="selectedFilter === 'all'
                ? 'bg-bcGovColor-activeBlue text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
              @click="selectedFilter = 'all'"
            >
              {{ $t('page.treeTable.filterAll') }}
            </button>
            <button
              type="button"
              class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              :class="selectedFilter === 'rentals'
                ? 'bg-bcGovColor-activeBlue text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
              @click="selectedFilter = 'rentals'"
            >
              {{ $t('page.treeTable.filterRentals') }} ({{ totalRentalsCount }})
            </button>
            <button
              type="button"
              class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              :class="selectedFilter === 'in_progress'
                ? 'bg-bcGovColor-activeBlue text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
              @click="selectedFilter = 'in_progress'"
            >
              {{ $t('page.treeTable.filterInProgress') }} ({{ totalInProgressCount }})
            </button>
            <button
              type="button"
              class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              :class="selectedFilter === 'action_needed'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'"
              @click="selectedFilter = 'action_needed'"
            >
              {{ $t('page.treeTable.filterActionRequired') }} ({{ totalActionNeededCount }})
            </button>
          </div>

          <!-- Search Input -->
          <div class="w-full sm:w-72">
            <UInput
              v-model="searchText"
              icon="i-mdi-magnify"
              :placeholder="$t('page.treeTable.searchPlaceholder')"
              size="sm"
              :ui="{ icon: { trailing: { pointer: '' } } }"
            >
              <template #trailing>
                <UButton
                  v-show="searchText !== ''"
                  color="gray"
                  variant="link"
                  icon="i-mdi-close"
                  :padded="false"
                  @click="searchText = ''"
                />
              </template>
            </UInput>
          </div>
        </div>
      </div>
    </template>

    <!-- Unified Tree Table Content using Abstracted ConnectTreeTable from strr-base-web -->
    <ConnectTreeTable
      ref="connectTreeTableRef"
      :columns="treeColumns"
      :rows="filteredTreeItems"
      :loading="isTreeLoading"
      :table-ui="tableUI"
      :expanded-ids="expandedIds"
      :empty-state="{ icon: 'i-mdi-folder-open-outline', label: searchText ? $t('page.treeTable.emptySearch', { search: searchText }) : $t('page.treeTable.emptyAll') }"
      @update:expanded-ids="expandedIds = $event"
    >
      <!-- Column 1: Property / Number with Tree Branch Visuals -->
      <template #property-data="{ row, isChild, isExpanded, toggleExpand, isLastChild }">
        <!-- Case A: Parent Registration Row -->
        <div v-if="row.rowType === 'registration'" class="relative -my-2 flex h-full min-h-[72px] items-start gap-2 py-2">
          <!-- Continuous Vertical Trunk Line: extends downward from chevron when expanded -->
          <div
            v-if="isExpanded && row.children && row.children.length > 0"
            class="pointer-events-none absolute -bottom-px left-[15px] top-8 w-[2px] bg-gray-300"
          />

          <!-- Fixed width Toggle Chevron Button Container (centered at x=16px) -->
          <div class="relative flex size-8 shrink-0 items-center justify-center">
            <button
              v-if="row.children && row.children.length > 0"
              type="button"
              class="focus:outline-hidden focus:ring-primary-500 rounded-md p-1 text-gray-600 transition-all hover:bg-gray-200/80 hover:text-gray-900 focus:ring-2"
              :aria-label="isExpanded ? $t('btn.collapse') : $t('btn.expand')"
              data-testid="toggle-expand-btn"
              @click.stop="toggleExpand()"
            >
              <UIcon
                :name="isExpanded ? 'i-mdi-chevron-down' : 'i-mdi-chevron-right'"
                class="size-5 transition-transform"
              />
            </button>
          </div>

          <!-- Rental Icon & Identity -->
          <div class="mt-0.5 shrink-0 rounded-md bg-blue-100/70 p-1.5 text-bcGovColor-activeBlue">
            <UIcon name="i-mdi-home-city-outline" class="size-4" />
          </div>

          <div class="flex min-w-0 flex-col gap-1">
            <div class="flex flex-wrap items-center space-x-2">
              <NuxtLink
                :to="getRegistrationDetailsPath(row.number)"
                class="truncate text-sm font-semibold text-bcGovColor-activeBlue hover:underline"
                @click="handleRegistrationLinkClick(row)"
              >
                {{ row.number }}
              </NuxtLink>
              <UBadge
                size="xs"
                color="blue"
                variant="subtle"
                class="text-[11px] font-medium"
              >
                {{ $t('page.treeTable.parentRental') }}
              </UBadge>
            </div>

            <!-- Property Nickname -->
            <span class="truncate text-xs font-medium text-gray-800">
              {{ row.nickname || $t('strr.label.unnamed') }}
            </span>

            <!-- Associated Applications Count Pill & Badges -->
            <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
              <button
                v-if="row.children && row.children.length > 0"
                type="button"
                class="inline-flex cursor-pointer items-center space-x-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-200 hover:text-bcGovColor-activeBlue"
                @click.stop="toggleExpand()"
              >
                <UIcon name="i-mdi-file-tree" class="size-3 text-gray-500" />
                <span>{{ row.children.length }} {{ row.children.length === 1 ? 'application' : 'applications' }}</span>
                <UIcon :name="isExpanded ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down'" class="size-3 text-gray-400" />
              </button>

              <UBadge
                v-if="row.hasRenewalDraft"
                color="blue"
                variant="subtle"
                size="xs"
                class="text-[11px]"
              >
                {{ $t('page.dashboardBadges.renewalInProgress') }}
              </UBadge>
            </div>
          </div>
        </div>

        <!-- Case B: Child Application Row (Nested under a Registration) -->
        <div v-else-if="isChild" class="relative -my-2 flex h-full min-h-[72px] items-center py-2 pl-14">
          <!-- Continuous Vertical Trunk Line: connects from row above to row below -->
          <div
            class="pointer-events-none absolute left-[15px] w-[2px] bg-gray-300"
            :class="isLastChild ? '-top-px bottom-1/2' : '-top-px -bottom-px'"
          />
          <!-- Horizontal Branch Line: extends right to meet child application icon -->
          <div
            class="pointer-events-none absolute left-[15px] top-1/2 -mt-px h-[2px] w-8 rounded-bl-sm bg-gray-300"
          />

          <!-- Application Icon -->
          <div class="mr-2 shrink-0 rounded bg-slate-200/80 p-1 text-gray-700">
            <UIcon
              :name="row.applicationType === 'renewal' ? 'i-mdi-autorenew' : 'i-mdi-file-document-outline'"
              class="size-4"
            />
          </div>

          <div class="flex min-w-0 flex-col gap-1">
            <div class="flex flex-wrap items-center space-x-2">
              <NuxtLink
                :to="getApplicationDetailsPath(row.applicationNumber || row.number)"
                class="text-sm font-medium text-bcGovColor-activeBlue hover:underline"
              >
                {{ row.number }}
              </NuxtLink>
              <UBadge
                size="xs"
                :color="row.applicationType === 'renewal' ? 'purple' : 'gray'"
                variant="outline"
                class="text-[10px]"
              >
                {{ getApplicationTypeBadgeText(row.applicationType) }}
              </UBadge>
            </div>
            <span class="text-[11px] text-gray-500">
              {{ $t('label.applicationNumber') }}: {{ row.applicationNumber || row.number }}
            </span>
          </div>
        </div>

        <!-- Case C: Standalone Initial Application (No Registration yet, In Progress) -->
        <div v-else class="flex items-start space-x-2 py-0.5">
          <!-- Indent Spacer matching Chevron width -->
          <div class="flex size-7 shrink-0 items-center justify-center">
            <span class="size-2 animate-pulse rounded-full bg-amber-500" />
          </div>

          <div class="mt-0.5 shrink-0 rounded-md bg-amber-100/80 p-1.5 text-amber-800">
            <UIcon name="i-mdi-clipboard-text-clock-outline" class="size-4" />
          </div>

          <div class="flex min-w-0 flex-col gap-1">
            <div class="flex flex-wrap items-center space-x-2">
              <NuxtLink
                v-if="row.statusKey !== ApplicationStatus.DRAFT"
                :to="getApplicationDetailsPath(row.applicationNumber || row.number)"
                class="truncate text-sm font-semibold text-bcGovColor-activeBlue hover:underline"
              >
                {{ row.number }}
              </NuxtLink>
              <span v-else class="text-sm font-semibold text-gray-800">
                {{ row.number }}
              </span>

              <UBadge
                size="xs"
                color="amber"
                variant="subtle"
                class="text-[11px] font-medium"
              >
                {{ $t('page.treeTable.standaloneInitialApp') }}
              </UBadge>
            </div>

            <!-- Nickname if provided -->
            <span v-if="row.nickname" class="truncate text-xs font-medium text-gray-700">
              {{ row.nickname }}
            </span>

            <span class="text-[11px] text-amber-700">
              {{ $t('page.treeTable.awaitingApproval') }}
            </span>
          </div>
        </div>
      </template>

      <!-- Column 2: Address & Jurisdiction -->
      <template #address-data="{ row, isChild }">
        <!-- For Registrations and Standalone Applications -->
        <div v-if="!isChild" class="flex flex-col">
          <span class="font-medium text-gray-900">
            {{ formatAddressLines(row.address).line1 }}
          </span>
          <span class="text-xs text-gray-500">
            {{ formatAddressLines(row.address).line2 }}
            <span v-if="row.localGovernment"> · {{ row.localGovernment }}</span>
          </span>
        </div>

        <!-- For Child Applications -->
        <div v-else class="flex items-center space-x-1.5 text-xs text-gray-500">
          <UIcon name="i-mdi-link-variant" class="size-3.5 text-gray-400" />
          <span class="italic">{{ $t('page.treeTable.parentRental') }}</span>
        </div>
      </template>

      <!-- Column 3: Status Badge -->
      <template #status-data="{ row }">
        <!-- Expired Status -->
        <span
          v-if="row.expiryState === ExpiryState.EXPIRED"
          class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-bcGovColor-error"
        >
          <UIcon name="i-mdi-alert-circle-outline" class="mr-1 size-3.5" />
          {{ t('label.expired') }}
        </span>

        <!-- Expiring Soon Status -->
        <span
          v-else-if="row.expiryState === ExpiryState.EXPIRING_SOON"
          class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-bcGovColor-caution"
        >
          <UIcon name="i-mdi-clock-alert-outline" class="mr-1 size-3.5" />
          {{ t('label.expiringSoon') }}
        </span>

        <!-- Draft Status -->
        <span
          v-else-if="row.statusKey === ApplicationStatus.DRAFT"
          class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
        >
          <UIcon name="i-mdi-file-edit-outline" class="mr-1 size-3.5 text-gray-500" />
          {{ t('label.draft') }}
        </span>

        <!-- Payment Due Status -->
        <span
          v-else-if="row.statusKey === ApplicationStatus.PAYMENT_DUE || (row.hostActions && row.hostActions.includes(HostActions.SUBMIT_PAYMENT))"
          class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
        >
          <UIcon name="i-mdi-currency-usd" class="mr-1 size-3.5" />
          {{ t('label.paymentDue') }}
        </span>

        <!-- Full Review / In Review -->
        <span
          v-else-if="row.statusKey === ApplicationStatus.FULL_REVIEW"
          class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
        >
          <UIcon name="i-mdi-magnify" class="mr-1 size-3.5" />
          {{ row.status || t('label.fullReview') }}
        </span>

        <!-- Default status -->
        <span
          v-else
          class="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800"
        >
          <UIcon name="i-mdi-check-circle-outline" class="mr-1 size-3.5" />
          {{ row.status || t('label.active') }}
        </span>
      </template>

      <!-- Column 4: Expiration Date / Date Submitted -->
      <template #date-data="{ row }">
        <!-- Registration: Expiry Date -->
        <div v-if="row.rowType === 'registration'" class="flex flex-col">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {{ $t('label.expires') }}
          </span>
          <span
            :class="{
              'font-bold text-bcGovColor-error': row.expiryState === ExpiryState.EXPIRED,
              'font-bold text-bcGovColor-caution': row.expiryState === ExpiryState.EXPIRING_SOON,
              'font-medium text-gray-900': row.expiryState === ExpiryState.ACTIVE
            }"
          >
            {{ row.expiryDate ? dateToStringPacific(row.expiryDate) : t('text.notAvailable') }}
          </span>
        </div>

        <!-- Application: Submission or Creation Date -->
        <div v-else class="flex flex-col">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {{ $t('label.submitted') }}
          </span>
          <span class="text-gray-700">
            {{ row.dateSubmitted ? dateToStringPacific(row.dateSubmitted) : t('text.notAvailable') }}
          </span>
        </div>
      </template>

      <!-- Column 5: Contextual Actions -->
      <template #actions-data="{ row, isChild }">
        <div class="flex items-center justify-end gap-1.5">
          <!-- 1. Actions for Registration -->
          <template v-if="row.rowType === 'registration'">
            <UButton
              v-if="row.hasRenewalDraft"
              size="xs"
              color="primary"
              :label="$t('label.resumeDraft')"
              @click="handleResumeRenewalDraft(row)"
            />
            <UButton
              v-else-if="row.canRenew"
              size="xs"
              color="primary"
              :label="$t('btn.renew')"
              @click="handleRenewRegistration(row)"
            />
            <UButton
              size="xs"
              variant="outline"
              color="gray"
              :label="$t('btn.view')"
              :to="getRegistrationDetailsPath(row.number)"
              @click="handleRegistrationLinkClick(row)"
            />
          </template>

          <!-- 2. Actions for Child Application -->
          <template v-else-if="isChild">
            <UButton
              v-if="row.statusKey === ApplicationStatus.DRAFT"
              size="xs"
              color="primary"
              :label="$t('label.resumeDraft')"
              @click="handleApplicationSelect(row)"
            />
            <UButton
              v-else-if="row.statusKey === ApplicationStatus.PAYMENT_DUE || (row.hostActions && row.hostActions.includes(HostActions.SUBMIT_PAYMENT))"
              size="xs"
              color="primary"
              :label="$t('btn.payNow')"
              @click="handlePayNow(row)"
            />
            <UButton
              size="xs"
              variant="outline"
              color="gray"
              :label="$t('btn.view')"
              :to="getApplicationDetailsPath(row.applicationNumber || row.number)"
            />
          </template>

          <!-- 3. Actions for Standalone Initial Application -->
          <template v-else>
            <!-- Draft Initial Application -->
            <template v-if="row.statusKey === ApplicationStatus.DRAFT">
              <UButton
                size="xs"
                color="primary"
                :label="$t('label.resumeDraft')"
                :disabled="deletingAppNumber === row.number"
                @click="handleApplicationSelect(row)"
              />
              <UPopover :popper="{ placement: 'bottom-end' }">
                <UButton
                  size="xs"
                  color="gray"
                  variant="outline"
                  icon="i-mdi-dots-vertical"
                  :aria-label="$t('text.showMoreOptions')"
                  :disabled="deletingAppNumber === row.number"
                />
                <template #panel>
                  <div class="p-1">
                    <UButton
                      size="xs"
                      color="red"
                      variant="ghost"
                      icon="i-mdi-trash-can-outline"
                      :label="$t('btn.deleteApplication')"
                      :loading="deletingAppNumber === row.number"
                      @click="handleDeleteDraft(row)"
                    />
                  </div>
                </template>
              </UPopover>
            </template>

            <!-- Payment Due Initial Application -->
            <template v-else-if="row.statusKey === ApplicationStatus.PAYMENT_DUE || (row.hostActions && row.hostActions.includes(HostActions.SUBMIT_PAYMENT))">
              <UButton
                size="xs"
                color="primary"
                :label="$t('btn.payNow')"
                @click="handlePayNow(row)"
              />
              <UButton
                size="xs"
                variant="outline"
                color="gray"
                :label="$t('btn.view')"
                :to="getApplicationDetailsPath(row.applicationNumber || row.number)"
              />
            </template>

            <!-- Standard View for other In-Review Application Statuses -->
            <template v-else>
              <UButton
                size="xs"
                variant="outline"
                color="gray"
                :label="$t('btn.view')"
                :to="getApplicationDetailsPath(row.applicationNumber || row.number)"
              />
            </template>
          </template>
        </div>
      </template>
    </ConnectTreeTable>
  </ConnectPageSection>
</template>
