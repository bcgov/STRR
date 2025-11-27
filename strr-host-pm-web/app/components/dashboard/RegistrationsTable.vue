<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const accountStore = useConnectAccountStore()
const permitStore = useHostPermitStore()
const { getAccountRegistrations } = useStrrApi()
const { isDashboardTableSortingEnabled } = useHostFeatureFlags()

const props = withDefaults(defineProps<{
  registrationsLimit?: number
}>(), {
  registrationsLimit: 6
})

// Pagination state
const registrationsPage = ref(1)

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
const hasRenewalDraft = (registration: any): boolean => {
  if (!registration?.header?.applications) {
    return false
  }
  return registration.header.applications.some((app: any) =>
    app.applicationType === 'renewal' && app.applicationStatus === 'DRAFT'
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

// Data mapping
const mapRegistrationsList = (registrations: any[]) => {
  if (!registrations) {
    return []
  }
  return registrations.map((registration: any) => {
    const displayAddress = registration.unitAddress
    return {
      number: registration.registrationNumber,
      status: registration.header?.hostStatus || registration.status,
      address: displayAddress,
      localGovernment: registration.unitDetails?.jurisdiction || t('text.notAvailable'),
      expiryDate: registration.expiryDate,
      isExpiryCritical: isExpiryDateCritical(registration.expiryDate),
      hasRenewalDraft: hasRenewalDraft(registration),
      latestApplicationNumber: getLatestApplicationNumber(registration),
      registrationId: registration.id
    }
  })
}

// Fetch Registrations
const { data: registrationsResp, status: registrationsStatus } = await useAsyncData(
  'host-registrations-list',
  async () => {
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
  },
  {
    watch: [() => accountStore.currentAccount.id, registrationsPage],
    default: () => ({ registrations: [], total: 0 })
  }
)

const registrationsList = computed(() => mapRegistrationsList(registrationsResp.value?.registrations || []))

// Navigation handler
async function handleRegistrationSelect (row: any) {
  permitStore.selectedRegistrationId = row.registrationId
  await navigateTo(localePath('/dashboard/registration/' + row.number))
}
</script>

<template>
  <ConnectPageSection>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="font-normal">
          {{ $t('page.dashboardList.myShortTermRentals') }} ({{ registrationsResp?.total || 0 }})
        </h2>
        <div class="flex gap-3">
          <UPagination
            v-if="(registrationsResp?.total || 0) > registrationsLimit"
            v-model="registrationsPage"
            :page-count="registrationsLimit"
            size="lg"
            :total="registrationsResp?.total || 0"
            :ui="paginationUI"
          />
        </div>
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
          <span>{{ row.number }}</span>
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
        <span :class="{'font-bold text-red-500': row.isExpiryCritical}">
          {{ row.expiryDate ? dateToStringPacific(row.expiryDate) : t('text.notAvailable') }}
        </span>
      </template>

      <template #actions-data="{ row }">
        <UButton
          :label="$t('btn.view')"
          block
          @click="handleRegistrationSelect(row)"
        />
      </template>
    </UTable>
  </ConnectPageSection>
</template>
