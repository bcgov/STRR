<script setup lang="ts">
const { t } = useNuxtApp().$i18n
const localePath = useLocalePath()
const accountStore = useConnectAccountStore()
const strrModal = useStrrModals()
const { handlePaymentRedirect } = useConnectNav()
const { deleteApplication, getAccountApplications, searchApplications } = useStrrApi()
const { isDashboardTableSortingEnabled, isHostSearchTextFieldsEnabled } = useHostFeatureFlags()

const props = withDefaults(defineProps<{
  applicationsLimit?: number
}>(), {
  applicationsLimit: 6
})

// Pagination and search state from composable
const { page: applicationsPage } = useDashboardTablePagination('appPage')
const { searchText } = useDashboardTableSearch('appSearch')
const isSearching = computed(() => searchText.value.length >= 3)

// When starting a new search (or clearing), always return to page 1
watch(searchText, () => {
  if (applicationsPage.value !== 1) {
    applicationsPage.value = 1
  }
})

// Allowed statuses for applications in progress
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

// Data mapping
const mapApplicationsList = (applications: HostApplicationResp['applications']): ApplicationRow[] => {
  if (!applications) {
    return []
  }
  return applications.map((app): ApplicationRow => {
    const displayAddress = app.header.registrationAddress || app.registration.unitAddress
    return {
      number: app.header.applicationNumber,
      status: app.header.hostStatus,
      // Use enum status for action checks, hostStatus is only for display text
      statusKey: app.header.status,
      hostActions: (app.header.hostActions || []) as HostActions[],
      address: displayAddress,
      localGovernment: app.registration?.strRequirements?.organizationNm || t('text.notAvailable'),
      dateSubmitted: app.header.applicationDateTime,
      applicationNumber: app.header.applicationNumber,
      paymentToken: app.header.paymentToken
    }
  })
}

// Fetch Applications
const fetchApplications = async () => {
  if (isSearching.value) {
    const resp = await searchApplications<HostApplicationResp>(
      searchText.value,
      props.applicationsLimit,
      applicationsPage.value,
      allowedStatuses,
      undefined,
      undefined,
      ApplicationType.HOST
    )
    if (!resp) {
      return { applications: [], total: 0, filteredCount: 0 }
    }
    return {
      applications: resp.applications,
      total: resp.total,
      filteredCount: resp.total
    }
  } else {
    const resp = await getAccountApplications<HostApplicationResp>(
      props.applicationsLimit,
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
  }
}

const { data: applicationsResp, status: applicationsStatus, refresh: refreshApplications } = await useAsyncData(
  'host-applications-list',
  useDebounceFn(fetchApplications, 500),
  {
    watch: [() => accountStore.currentAccount.id, applicationsPage, searchText],
    default: () => ({ applications: [], total: 0, filteredCount: 0 })
  }
)

const applicationsList = computed(() => mapApplicationsList(applicationsResp.value?.applications || []))
const totalFilteredApplications = computed(() => applicationsResp.value?.filteredCount || 0)

// Delete draft application
const deleting = ref(false)
async function deleteDraft (row: ApplicationRow) {
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
async function handleApplicationSelect (row: ApplicationRow) {
  await navigateTo(localePath('/application?applicationId=' + row.applicationNumber))
}

/** Returns true when an application row is in draft status. */
const isDraftApplication = (row: ApplicationRow): boolean =>
  row.statusKey === ApplicationStatus.DRAFT

/** Returns true when an application row should show the Pay Now action. */
const isPaymentDueApplication = (row: ApplicationRow): boolean =>
  row.statusKey === ApplicationStatus.PAYMENT_DUE || row.hostActions.includes(HostActions.SUBMIT_PAYMENT)

/** Builds the application details route for a given application number. */
const getApplicationDetailsPath = (applicationNumber: string): string =>
  localePath('/dashboard/application/' + applicationNumber)

/** Redirects the user to payment for a payment due application. */
function handlePayNow (row: ApplicationRow) {
  if (row.paymentToken) {
    handlePaymentRedirect(
      row.paymentToken,
      '/dashboard/application/' + row.applicationNumber
    )
  }
}
</script>

<template>
  <ConnectPageSection
    v-if="applicationsResp && (applicationsResp.total > 0 || isSearching)"
    data-testid="applications-table"
  >
    <template #header>
      <div class="flex flex-wrap items-center gap-3 md:flex-nowrap md:gap-24">
        <h2 class="whitespace-nowrap font-normal">
          {{ $t('page.dashboardList.applicationsInProgress') }} ({{ totalFilteredApplications }})
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
          v-if="totalFilteredApplications > applicationsLimit"
          v-model="applicationsPage"
          :page-count="applicationsLimit"
          size="lg"
          :total="totalFilteredApplications"
          :ui="paginationUI"
          class="w-full md:ml-auto md:w-auto"
        />
      </div>
    </template>
    <UTable
      :columns="applicationsColumns"
      :rows="applicationsList"
      :loading="applicationsStatus === 'pending' || deleting"
      :empty-state="{ icon: '', label: t('page.dashboardList.noApplicationsInProgress') }"
      :ui="tableUI"
    >
      <template #number-data="{ row }">
        <NuxtLink
          v-if="!isDraftApplication(row)"
          :to="getApplicationDetailsPath(row.applicationNumber)"
          class="w-fit text-bcGovColor-activeBlue hover:underline"
        >
          {{ row.number }}
        </NuxtLink>
        <span v-else>{{ row.number }}</span>
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

      <template #dateSubmitted-data="{ row }">
        {{ dateToStringPacific(row.dateSubmitted) }}
      </template>

      <template #actions-data="{ row }">
        <div class="flex gap-px">
          <template v-if="isDraftApplication(row)">
            <UButton
              class="grow justify-center lg:rounded-r-none"
              :label="$t('label.resumeDraft')"
              :disabled="row.disabled"
              @click="handleApplicationSelect(row)"
            />
            <UPopover :popper="{ placement: 'bottom-end' }">
              <UButton
                class="grow justify-center lg:flex-none lg:rounded-l-none"
                icon="i-mdi-menu-down"
                :aria-label="$t('text.showMoreOptions')"
                :disabled="row.disabled"
              />
              <template #panel>
                <UButton
                  class="m-2"
                  :label="$t('btn.deleteApplication')"
                  variant="link"
                  @click="deleteDraft(row)"
                />
              </template>
            </UPopover>
          </template>
          <template v-else>
            <UButton
              v-if="isPaymentDueApplication(row)"
              class="mr-2 grow justify-center"
              :label="$t('btn.payNow')"
              @click="handlePayNow(row)"
            />
            <UButton
              class="grow justify-center"
              :label="$t('btn.view')"
              variant="outline"
              :to="getApplicationDetailsPath(row.applicationNumber)"
            />
          </template>
        </div>
      </template>
    </UTable>
  </ConnectPageSection>
</template>
