<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const accountStore = useConnectAccountStore()
const strrModal = useStrrModals()
const { deleteApplication, getAccountApplications } = useStrrApi()
const { isDashboardTableSortingEnabled } = useHostFeatureFlags()

const props = withDefaults(defineProps<{
  applicationsLimit?: number
}>(), {
  applicationsLimit: 6
})

// Pagination state
const applicationsPage = ref(1)

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
const mapApplicationsList = (applications: any[]) => {
  if (!applications) {
    return []
  }
  return applications.map((app: any) => {
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

// Fetch Applications
const { data: applicationsResp, status: applicationsStatus, refresh: refreshApplications } = await useAsyncData(
  'host-applications-list',
  async () => {
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
  },
  {
    watch: [() => accountStore.currentAccount.id, applicationsPage],
    default: () => ({ applications: [], total: 0, filteredCount: 0 })
  }
)

const applicationsList = computed(() => mapApplicationsList(applicationsResp.value?.applications || []))
const totalFilteredApplications = computed(() => applicationsResp.value?.filteredCount || 0)

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
    await navigateTo(localePath('/dashboard/application/' + row.applicationNumber))
  }
}
</script>

<template>
  <ConnectPageSection v-if="applicationsResp && applicationsResp.total > 0">
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="font-normal">
          {{ $t('page.dashboardList.applicationsInProgress') }} ({{ totalFilteredApplications }})
        </h2>
        <div class="flex gap-3">
          <UPagination
            v-if="totalFilteredApplications > applicationsLimit"
            v-model="applicationsPage"
            :page-count="applicationsLimit"
            size="lg"
            :total="totalFilteredApplications"
            :ui="paginationUI"
          />
        </div>
      </div>
    </template>
    <UTable
      :columns="applicationsColumns"
      :rows="applicationsList"
      :loading="applicationsStatus === 'pending' || deleting"
      :empty-state="{ icon: '', label: t('page.dashboardList.noApplicationsInProgress') }"
      :ui="tableUI"
    >
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
        <div class="flex flex-col gap-px lg:flex-row">
          <UButton
            :class="row.status === 'Draft' ? 'justify-center grow lg:rounded-r-none' : ''"
            :label="row.status === 'Draft' ? $t('label.resumeDraft') : $t('btn.view')"
            :block="row.status !== 'Draft'"
            :disabled="row.disabled"
            @click="handleApplicationSelect(row)"
          />
          <UPopover v-if="row.status === 'Draft'" :popper="{ placement: 'bottom-end' }">
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
        </div>
      </template>
    </UTable>
  </ConnectPageSection>
</template>
