<script setup lang="ts">
import { DateTime } from 'luxon'
const { t } = useNuxtApp().$i18n
const localePath = useLocalePath()
const accountStore = useConnectAccountStore()
const permitStore = useHostPermitStore()
const { getAccountRegistrations, searchRegistrations } = useStrrApi()
const { isDashboardTableSortingEnabled, isHostSearchTextFieldsEnabled } = useHostFeatureFlags()

const props = withDefaults(defineProps<{
  registrationsLimit?: number
}>(), {
  registrationsLimit: 6
})

// Pagination and search state from composable
const { page: registrationsPage } = useDashboardTablePagination('regPage')
const { searchText } = useDashboardTableSearch('regSearch')
const isSearching = computed(() => searchText.value.length >= 3)

// When starting a new search (or clearing), always return to page 1
watch(searchText, () => {
  if (registrationsPage.value !== 1) {
    registrationsPage.value = 1
  }
})

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

const registrationsColumns = [
  ...commonColumns,
  createColumn('expiryDate', t('label.expirationDate')),
  createColumn('actions', t('label.actions'), false)
]

// UI configurations
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

// Helper functions
/** Returns true when the registration has a renewal draft application. */
const hasRenewalDraft = (registration: RegistrationRecord): boolean => {
  if (!registration?.header?.applications) {
    return false
  }
  return registration.header.applications.some((app: RegistrationApplicationSummary) =>
    app.applicationType === 'renewal' && app.applicationStatus === ApplicationStatus.DRAFT
  )
}

/** Returns true when the registration has a renewal payment due application. */
const hasRenewalPaymentPending = (registration: RegistrationRecord): boolean => {
  if (!registration?.header?.applications) {
    return false
  }
  return registration.header.applications.some((app: RegistrationApplicationSummary) =>
    app.applicationType === 'renewal' &&
    app.applicationStatus === ApplicationStatus.PAYMENT_DUE
  )
}

/** Gets the renewal draft application number from linked applications. */
const getRenewalDraftApplicationNumber = (registration: RegistrationRecord): string | undefined => {
  if (!registration?.header?.applications) {
    return undefined
  }

  const renewalDraft = registration.header.applications.find((app: RegistrationApplicationSummary) =>
    app.applicationType === 'renewal' && app.applicationStatus === ApplicationStatus.DRAFT
  )

  return renewalDraft?.applicationNumber
}

/** Returns the renewal warning window in days by registration type. */
const getRenewalWindowDays = (registrationType: ApplicationType): number => {
  // Keep these values in sync with backend DAYS_BEFORE_EXPIRY_BY_TYPE.
  // TODO: Remove hardcoded fallback values and let API provide the values so that they stay in sync.
  if (registrationType === ApplicationType.STRATA_HOTEL) {
    return 60
  }
  return 40
}

/** Calculates whole days remaining until the expiry date in Pacific time. */
const getDaysUntilExpiry = (expiryDate: string): number | null => {
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

/** Maps an expiry date to an expiry state used for UI styling and actions. */
const getExpiryState = (registrationType: ApplicationType, expiryDate: string | undefined): ExpiryState => {
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

/** Builds the registration details route for a registration number. */
const getRegistrationDetailsPath = (registrationNumber: string): string =>
  localePath('/dashboard/registration/' + registrationNumber)

/** Persists selected registration id before navigating to details. */
const handleRegistrationLinkClick = (row: RegistrationRow) => {
  permitStore.selectedRegistrationId = row.registrationId?.toString()
}

/** Determines whether the Renew action should be shown for a row. */
const canShowRenewAction = (
  expiryState: ExpiryState,
  renewalDraftExists: boolean,
  renewalPaymentPending: boolean
): boolean => {
  return [ExpiryState.EXPIRED, ExpiryState.EXPIRING_SOON].includes(expiryState) &&
    !renewalDraftExists &&
    !renewalPaymentPending
}

// Data mapping
const mapRegistrationsList = (registrations: RegistrationRecord[]): RegistrationRow[] => {
  if (!registrations) {
    return []
  }
  return registrations.map((registration: RegistrationRecord): RegistrationRow => {
    const displayAddress = registration.unitAddress
    const expiryState = getExpiryState(registration.registrationType, registration.expiryDate)
    const renewalDraftExists = hasRenewalDraft(registration)
    const renewalPaymentPending = hasRenewalPaymentPending(registration)
    const renewalDraftApplicationNumber = getRenewalDraftApplicationNumber(registration)
    return {
      number: registration.registrationNumber,
      status: registration.header?.hostStatus || registration.status,
      address: displayAddress,
      localGovernment: registration.unitDetails?.jurisdiction || t('text.notAvailable'),
      expiryDate: registration.expiryDate,
      expiryState,
      hasRenewalDraft: renewalDraftExists,
      renewalDraftApplicationNumber,
      canRenew: canShowRenewAction(expiryState, renewalDraftExists, renewalPaymentPending),
      registrationId: registration.id
    }
  })
}

// Fetch Registrations
/** Fetches registration rows from search or account list endpoints. */
const fetchRegistrations = async () => {
  if (isSearching.value) {
    const resp = await searchRegistrations<ApiRegistrationResp>(
      searchText.value,
      props.registrationsLimit,
      registrationsPage.value,
      undefined,
      undefined,
      ApplicationType.HOST
    )
    if (!resp) {
      return { registrations: [], total: 0 }
    }
    return { registrations: resp.registrations || [], total: resp.total || 0 }
  } else {
    const resp = await getAccountRegistrations<ApiRegistrationResp>(
      undefined,
      ApplicationType.HOST,
      props.registrationsLimit,
      registrationsPage.value
    )
    // Handle both array and object response formats
    if (Array.isArray(resp)) {
      return { registrations: resp, total: resp.length }
    }
    return { registrations: resp?.registrations || [], total: resp?.total || 0 }
  }
}

const { data: registrationsResp, status: registrationsStatus } = await useAsyncData(
  'host-registrations-list',
  useDebounceFn(fetchRegistrations, 500),
  {
    watch: [() => accountStore.currentAccount.id, registrationsPage, searchText],
    default: () => ({ registrations: [], total: 0 })
  }
)

const registrationsList = computed(() => mapRegistrationsList(registrationsResp.value?.registrations || []))

/** Starts a new renewal flow for the selected registration. */
async function handleRenewRegistration (row: RegistrationRow) {
  permitStore.renewalRegId = row.registrationId?.toString()
  await navigateTo({
    path: localePath('/application'),
    query: { renew: 'true' }
  })
}

/** Opens the existing renewal draft for the selected registration. */
async function handleResumeRenewalDraft (row: RegistrationRow) {
  if (!row.renewalDraftApplicationNumber) {
    return
  }

  permitStore.renewalRegId = undefined
  await navigateTo({
    path: localePath('/application'),
    query: {
      renew: 'true',
      applicationId: row.renewalDraftApplicationNumber
    }
  })
}
</script>

<template>
  <ConnectPageSection
    data-testid="registrations-table"
  >
    <template #header>
      <div class="flex flex-wrap items-center gap-3 md:flex-nowrap md:gap-24">
        <h2 class="whitespace-nowrap font-normal">
          {{ $t('page.dashboardList.myShortTermRentals') }} ({{ registrationsResp?.total || 0 }})
        </h2>
        <UInput
          v-if="isHostSearchTextFieldsEnabled"
          v-model="searchText"
          icon="i-mdi-magnify"
          :placeholder="$t('strr.label.search')"
          :ui="{ icon: { trailing: { pointer: '' } } }"
          class="ml-auto w-32 md:ml-0 md:w-64"
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
        <UPagination
          v-if="(registrationsResp?.total || 0) > registrationsLimit"
          v-model="registrationsPage"
          :page-count="registrationsLimit"
          size="lg"
          :total="registrationsResp?.total || 0"
          :ui="paginationUI"
          class="w-full md:ml-auto md:w-auto"
        />
      </div>
    </template>
    <UTable
      :columns="registrationsColumns"
      :rows="registrationsList"
      :loading="registrationsStatus === 'pending'"
      :empty-state="{ icon: '', label: t('page.dashboardList.noRegistrationsFound') }"
      :ui="tableUI"
    >
      <template #number-data="{ row }">
        <div class="flex flex-col gap-1">
          <NuxtLink
            :to="getRegistrationDetailsPath(row.number)"
            class="w-fit text-bcGovColor-activeBlue hover:underline"
            @click="handleRegistrationLinkClick(row)"
          >
            {{ row.number }}
          </NuxtLink>
          <div class="flex gap-1">
            <UBadge
              v-if="row.hasRenewalDraft"
              color="blue"
              variant="subtle"
              size="xs"
              class="text-xs"
            >
              {{ $t('page.dashboardBadges.renewalInProgress') }}
            </UBadge>
          </div>
        </div>
      </template>

      <template #status-data="{ row }">
        <span v-if="row.expiryState === ExpiryState.EXPIRED" class="text-bcGovColor-midGray">
          {{ t('label.expired') }}
        </span>
        <span v-else-if="row.expiryState === ExpiryState.EXPIRING_SOON" class="text-bcGovColor-midGray">
          {{ t('label.expiringSoon') }}
        </span>
        <span v-else>{{ row.status }}</span>
      </template>

      <template #address-data="{ row }">
        <div class="flex flex-col">
          <span>
            {{
              `${row.address.unitNumber ? row.address.unitNumber + '-' : ''}${
                row.address.streetNumber
              } ${row.address.streetName}`
            }}
          </span>
          <span>{{ row.address.city }}</span>
        </div>
      </template>

      <template #expiryDate-data="{ row }">
        <span
          :class="{
            'font-bold text-bcGovColor-error': row.expiryState === ExpiryState.EXPIRED,
            'font-bold text-bcGovColor-caution': row.expiryState === ExpiryState.EXPIRING_SOON
          }"
        >
          {{ row.expiryDate ? dateToStringPacific(row.expiryDate) : t('text.notAvailable') }}
        </span>
      </template>

      <template #actions-data="{ row }">
        <div class="flex gap-2">
          <UButton
            v-if="row.hasRenewalDraft"
            class="grow justify-center"
            :label="$t('label.resumeDraft')"
            @click="handleResumeRenewalDraft(row)"
          />
          <UButton
            v-else-if="row.canRenew"
            class="grow justify-center"
            :label="$t('btn.renew')"
            @click="handleRenewRegistration(row)"
          />
          <UButton
            class="grow justify-center"
            :label="$t('btn.view')"
            variant="outline"
            :to="getRegistrationDetailsPath(row.number)"
            @click="handleRegistrationLinkClick(row)"
          />
        </div>
      </template>
    </UTable>
  </ConnectPageSection>
</template>
