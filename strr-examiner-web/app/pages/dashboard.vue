<script setup lang="ts">
import isEmpty from 'lodash/isEmpty'
import { sub } from 'date-fns'

const localePath = useLocalePath()
const { t } = useI18n()
// TODO: ApplicationStatus.FULL_REVIEW is temporary until we have reqs defined
// const { limit, page, getApplicationList } = useStrrBasePermitList(undefined, undefined) // leaving this for reference
// const { getAccountApplications } = useStrrApi() // leaving this for reference
const exStore = useExaminerStore()
const ldStore = useConnectLaunchdarklyStore()
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

useHead({
  title: t('page.dashboardList.title')
})

definePageMeta({
  layout: 'examiner',
  middleware: ['auth']
})

// leaving this for reference
// const { data: applicationListResp, status } = await useAsyncData(
//   'application-list-resp',
//   getApplicationList,
//   {
//     watch: [limit, page],
//     default: () => ({ applications: [], total: 0 })
//   }
// )

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

const getAdjudicatorColumn = (header: ApplicationHeader) => {
  return header.assignee?.username || '-'
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

// text currently matches anything, same as existing examiners app
// cannot combine search and registration type at this point in time - so hacky if/else for the moment
const { data: applicationListResp, status } = await useAsyncData(
  'application-list-resp',
  useDebounceFn(exStore.fetchApplications, 500),
  {
    watch: [
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
        registrationType: t(`registrationType.${app.registration.registrationType}`),
        requirements: getRequirementsColumn(app),
        applicantName: getApplicantNameColumn(app),
        propertyAddress: getPropertyAddressColumn(app),
        status: app.header.registrationStatus ? app.header.examinerStatus : app.header.hostStatus, // TODO: should this have registration status? maybe this should just return app.header.status?
        submissionDate: app.header.applicationDateTime,
        lastModified: getLastStatusChangeColumn(app.header),
        adjudicator: getAdjudicatorColumn(app.header)
      }))

      return { applications, total: res.total }
    }
  }
)

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
  if (enableTableFilters.value) {
    return [
      { key: 'registrationNumber', label: t('page.dashboardList.columns.registrationNumber'), sortable: true },
      { key: 'registrationType', label: t('page.dashboardList.columns.registrationType'), sortable: true },
      { key: 'requirements', label: t('page.dashboardList.columns.requirements'), sortable: true },
      { key: 'applicantName', label: t('page.dashboardList.columns.applicantName'), sortable: true },
      { key: 'propertyAddress', label: t('page.dashboardList.columns.propertyAddress'), sortable: true },
      { key: 'submissionDate', label: t('page.dashboardList.columns.submissionDate'), sortable: true },
      { key: 'status', label: t('page.dashboardList.columns.status'), sortable: true },
      { key: 'lastModified', label: 'Last Modified', sortable: true },
      { key: 'adjudicator', label: t('page.dashboardList.columns.adjudicator'), sortable: true }
    ]
  } else {
    return [
      { key: 'registrationNumber', label: t('page.dashboardList.columns.registrationNumber'), sortable: false },
      { key: 'registrationType', label: t('page.dashboardList.columns.registrationType'), sortable: false },
      { key: 'requirements', label: t('page.dashboardList.columns.requirements'), sortable: false },
      { key: 'applicantName', label: t('page.dashboardList.columns.applicantName'), sortable: false },
      { key: 'propertyAddress', label: t('page.dashboardList.columns.propertyAddress'), sortable: false },
      { key: 'submissionDate', label: t('page.dashboardList.columns.submissionDate'), sortable: false },
      { key: 'status', label: t('page.dashboardList.columns.status'), sortable: false },
      { key: 'lastModified', label: 'Last Modified', sortable: false },
      { key: 'adjudicator', label: t('page.dashboardList.columns.adjudicator'), sortable: false }
    ]
  }
})

const selectedColumns = ref([...columns.value])
const columnsTable = computed(() => columns.value.filter(column => selectedColumns.value.includes(column)))
const sort = ref<TableSort>({ column: 'submissionDate', direction: 'asc' as const })

async function handleRowSelect (row: any) {
  // Fix: Filter Input Double Click Event Propagation
  if (!row.applicationNumber) {
    return
  }
  status.value = 'pending'
  await navigateTo(localePath(`${RoutesE.EXAMINE}/${row.applicationNumber}`))
}

async function goToRegistration (registrationId: string) {
  status.value = 'pending'
  await navigateTo(localePath(`${RoutesE.REGISTRATION}/${registrationId}`))
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
</script>
<template>
  <div
    id="dashboard-page"
    class="flex grow flex-col space-y-6 py-6"
    data-testid="examiner-dashboard-page"
  >
    <h1>{{ $t('label.search') }}</h1>
    <ConnectPageSection
      :aria-label="$t('label.applicationListSectionAria', { count: applicationListResp?.total || 0 })"
    >
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3 text-gray-900">
          <div class="flex flex-wrap items-center gap-3">
            <UInput
              v-model="exStore.tableFilters.searchText"
              :placeholder="$t('label.findInApplication')"
              :aria-label="$t('label.findInApplication')"
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
              :count="applicationListResp?.total || 0"
            />
            <UButton
              :label="$t('label.clearAllFilters')"
              icon="i-mdi-close"
              variant="link"
              :padded="false"
              :ui="{ gap: { sm: 'gap-x-1' } }"
              @click="exStore.resetFilters"
            />
          </div>
          <div class="flex flex-wrap items-center gap-3 text-gray-900">
            <UPagination
              v-if="applicationListResp.total > exStore.tableLimit"
              v-model="exStore.tablePage"
              :page-count="exStore.tableLimit"
              size="lg"
              :total="applicationListResp?.total || 0"
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
                  <!-- TODO: aria labels? -->
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
        :rows="applicationListResp.applications"
        :loading="status === 'pending'"
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
            :options="[
              { label: 'Application Status', value: undefined, disabled: true },
              { label: 'Full Review', value: ApplicationStatus.FULL_REVIEW },
              { label: 'Provisional Review', value: ApplicationStatus.PROVISIONAL_REVIEW },
              { label: 'Payment Due', value: ApplicationStatus.PAYMENT_DUE },
              { label: 'Provisional', value: ApplicationStatus.PROVISIONAL },
              { label: 'Paid', value: ApplicationStatus.PAID },
              { label: 'Additional Info Requested', value: ApplicationStatus.ADDITIONAL_INFO_REQUESTED },
              { label: 'Provisionally Approved', value: ApplicationStatus.PROVISIONALLY_APPROVED },
              { label: 'Declined', value: ApplicationStatus.DECLINED },
              { label: 'Provisionally Declined', value: ApplicationStatus.PROVISIONALLY_DECLINED },
              { label: 'Auto Approved', value: ApplicationStatus.AUTO_APPROVED },
              { label: 'Full Review Approved', value: ApplicationStatus.FULL_REVIEW_APPROVED },
              { label: 'NOC - Pending', value: ApplicationStatus.NOC_PENDING },
              { label: 'NOC - Expired', value: ApplicationStatus.NOC_EXPIRED },
              { label: 'NOC - Pending - Provisional', value: ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING },
              { label: 'NOC - Expired - Provisional', value: ApplicationStatus.PROVISIONAL_REVIEW_NOC_EXPIRED },
              { label: 'Registration Status', value: undefined, disabled: true },
              { label: 'Active', value: RegistrationStatus.ACTIVE },
              { label: 'Suspended', value: RegistrationStatus.SUSPENDED },
              { label: 'Cancelled', value: RegistrationStatus.CANCELLED },
              { label: 'Expired', value: RegistrationStatus.EXPIRED }
            ]"
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

        <template v-if="enableTableFilters" #adjudicator-header="{ column }">
          <TableHeaderInput
            v-model="exStore.tableFilters.adjudicator"
            :column
            :sort
            @sort="handleColumnSort(column.key)"
          />
        </template>

        <!-- row slots -->
        <template #registrationNumber-data="{ row }">
          <div>
            {{ row.applicationNumber }}
          </div>
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
