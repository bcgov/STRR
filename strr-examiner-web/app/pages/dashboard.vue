<script setup lang="ts">
import isEmpty from 'lodash'
import { sub } from 'date-fns'
import { dateToString, dateToStringPacific } from '#imports'

const localePath = useLocalePath()
const { t } = useI18n()
// TODO: ApplicationStatus.FULL_REVIEW is temporary until we have reqs defined
const { limit, page, getApplicationList } = useStrrBasePermitList(undefined, undefined)

useHead({
  title: t('page.dashboardList.title')
})

definePageMeta({
  layout: 'examiner',
  middleware: ['auth']
})

const { data: applicationListResp, status } = await useAsyncData(
  'application-list-resp',
  getApplicationList,
  {
    watch: [limit, page],
    default: () => ({ applications: [], total: 0 })
  }
)

const mapApplicationsList = () => {
  if (!applicationListResp.value?.applications) {
    return []
  }
  return (applicationListResp.value.applications).map(
    (application: HostApplicationResp | PlatformApplicationResp | StrataApplicationResp) => {
      const {
        header: {
          applicationNumber,
          registrationNumber,
          examinerStatus,
          status,
          applicationDateTime
        },
        registration: { registrationType }
      } = application

      let requirements = ''
      let applicantName = ''
      let propertyAddress = ''
      let adjucator = ''
      if (registrationType === ApplicationType.HOST) {
        const hostApplication: ApiHostApplication = application.registration as ApiHostApplication
        applicantName = displayContactFullName(hostApplication.primaryContact) || ''
        propertyAddress = displayFullUnitAddress(hostApplication.unitAddress) || '-'
        requirements = isEmpty(hostApplication.strRequirements)
          ? t('page.dashboardList.requirements.host.none')
          : getHostPrRequirements(hostApplication)
        adjucator = 'host'
      } else if (registrationType === ApplicationType.PLATFORM) {
        const platformApplication = application.registration as ApiBasePlatformApplication
        applicantName = platformApplication.businessDetails.legalName
        propertyAddress = displayFullAddress(platformApplication.businessDetails.mailingAddress) || '-'
        requirements = t(`page.dashboardList.requirements.platform.${platformApplication.platformDetails.listingSize}`)
        adjucator = 'platform'
      } else if (registrationType === ApplicationType.STRATA_HOTEL) {
        const strataApplication = application.registration as ApiBaseStrataApplication
        applicantName = strataApplication.businessDetails.legalName
        propertyAddress = displayFullAddress(strataApplication.strataHotelDetails.location) || '-'
        // TODO: update Strata requirements once backend is ready
        requirements = '-'
        adjucator = 'strata'
      }

      return {
        applicationNumber,
        registrationNumber,
        registrationType: t(`registrationType.${registrationType}`),
        requirements,
        applicantName,
        propertyAddress,
        status: examinerStatus || status,
        submissionDate: application.header.applicationDateTime,
        lastModified: getLastStatusChangeColumn(application.header),
        adjucator
      }
    })
}

// Get PR requirements for the Host application
const getHostPrRequirements = (hostApplication: ApiHostApplication): string => {
  const { isBusinessLicenceRequired, isPrincipalResidenceRequired, isStrProhibited } =
    hostApplication.strRequirements as PropertyRequirements

  const { prExemptReason } = hostApplication.unitDetails

  // build an array of requirements and join non-empty strings with '/'
  return [
    isPrincipalResidenceRequired ? t('page.dashboardList.requirements.host.pr') : '',
    prExemptReason
      ? t(`page.dashboardList.requirements.host.${prExemptReason}`)
      : '',
    isBusinessLicenceRequired ? t('page.dashboardList.requirements.host.bl') : '',
    isStrProhibited ? t('page.dashboardList.requirements.host.prohibited') : ''
  ].filter(Boolean).join('/') ||
  // default value where there are no requirements
  t('page.dashboardList.requirements.host.none')
}
// const getHostPropertyManager = (propertyManager: ApiPropertyManager): string => {
//   if (!propertyManager) { return '' }

//   return propertyManager.propertyManagerType === OwnerType.INDIVIDUAL
//     ? displayContactFullName(propertyManager.contact as ApiPartyWithAddress) || ''
//     : propertyManager.business?.legalName || ''
// }

const applications = computed(() => mapApplicationsList())

const columns = [
  { key: 'registrationNumber', label: t('page.dashboardList.columns.registrationNumber'), sortable: false },
  { key: 'registrationType', label: t('page.dashboardList.columns.registrationType'), sortable: true },
  { key: 'requirements', label: t('page.dashboardList.columns.requirements'), sortable: true },
  { key: 'applicantName', label: t('page.dashboardList.columns.applicantName'), sortable: false },
  // { key: 'propertyHost', label: t('page.dashboardList.columns.propertyHost'), sortable: false },
  // { key: 'propertyManager', label: t('page.dashboardList.columns.propertyManager'), sortable: false },
  { key: 'propertyAddress', label: t('page.dashboardList.columns.propertyAddress'), sortable: false },
  { key: 'submissionDate', label: t('page.dashboardList.columns.submissionDate'), sortable: false },
  { key: 'status', label: t('page.dashboardList.columns.status'), sortable: false },
  { key: 'lastModified', label: 'Last Modified', sortable: false },
  { key: 'adjudicator', label: 'Adjudicator', sortable: false }
]

const selectedColumns = ref([...columns])

async function handleRowSelect (row: any) {
  status.value = 'pending'
  await navigateTo(localePath(`${RoutesE.EXAMINE}/${row.applicationNumber}`))
}

const sort = ref<TableSort>({ column: 'registrationType', direction: 'asc' as const })

watch(
  () => exStore.tableFilters,
  (newVal) => {
    console.log('new filters: ', newVal)
  }, { deep: true }
)
</script>
<template>
  <div class="h-full space-y-8 py-8 sm:space-y-10 sm:py-10">
    <UButton
      v-if="false"
      label="Force Error"
      color="red"
      variant="outline"
      :to="localePath('/examine/123')"
    />
    <div class="flex justify-end gap-3">
      <UPagination
        v-if="applicationListResp.total > limit"
        v-model="page"
        :page-count="limit"
        size="lg"
        :total="applicationListResp?.total || 0"
        :ui="{
          base: 'h-[42px]',
          default: {
            activeButton: { class: 'rounded' }
          }
        }"
      />
      <USelectMenu
        v-slot="{ open }"
        v-model="selectedColumns"
        :options="columns"
        multiple
        :ui="{ trigger: 'flex items-center w-full' }"
      >
        <UButton
          color="white"
          class="h-[42px] flex-1 justify-between text-gray-700"
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
    <UTable
      ref="tableRef"
      v-model:sort="sort"
      :columns="selectedColumns"
      :rows="applications"
      :loading="status === 'pending'"
      sort-mode="manual"
      :ui="{
        wrapper: 'relative overflow-x-auto h-[512px] bg-white',
        thead: 'sticky top-0 bg-white z-10',
        th: { padding: 'px-2 py-4' },
        td: {
          base: 'whitespace-normal max-w-96 align-top',
          padding: 'p-2',
          color: 'text-bcGovColor-midGray',
          font: '',
          size: 'text-sm',
        }
      }"
      @select="handleRowSelect"
    >
      <template #registrationNumber-header="{ column }">
        <TableHeaderInput
          v-model="exStore.tableFilters.registrationNumber"
          :column
          :sort
        />
      </template>

      <template #registrationType-header="{ column }">
        <TableHeaderSelect
          v-model="exStore.tableFilters.registrationType"
          :column
          :sort
          :options="[
            { label: 'Host', value: 'Host' },
            { label: 'Strata', value: 'Strata' },
            { label: 'Platform', value: 'Platform' }
          ]"
        />
      </template>

      <template #requirements-header="{ column }">
        <TableHeaderSelect
          v-model="exStore.tableFilters.requirements"
          :column
          :options="[
            { label: 'Host', value: undefined, disabled: true },
            { label: 'PR (Host)', value: 'pr-host' },
            { label: 'PR Exempt - Farm', value: 'pr-exempt-farm' },
            { label: 'PR Exempt - Strata', value: 'pr-exempt-strata' },
            { label: 'PR Exempt - Fractional', value: 'pr-exempt-fractional' },
            { label: 'BL', value: 'bl' },
            { label: 'Prohibited', value: 'prohibited' },
            { label: 'None (Host)', value: 'none-host' },
            // { label: 'None (Host)', value: undefined }, // TODO: implement ?
            { label: 'Platform', value: undefined, disabled: true },
            { label: 'Major', value: 'major' },
            { label: 'Medium', value: 'medium' },
            { label: 'Minor', value: 'minor' },
            { label: 'Strata', value: undefined, disabled: true },
            { label: 'PR (Strata)', value: 'pr-strata' },
            { label: 'None (Strata)', value: 'none-strata' },
          ]"
        />
      </template>

      <template #applicantName-header="{ column }">
        <TableHeaderInput
          v-model="exStore.tableFilters.applicantName"
          :column
          :sort
        />
      </template>

      <template #propertyAddress-header="{ column }">
        <TableHeaderInput
          v-model="exStore.tableFilters.propertyAddress"
          :column
          :sort
        />
      </template>

      <template #status-header="{ column }">
        <TableHeaderSelect
          v-model="exStore.tableFilters.status"
          :column
          :sort
          :options="[
            { label: 'Host', value: 'Host' },
            { label: 'Strata', value: 'Strata' },
            { label: 'Platform', value: 'Platform' }
          ]"
        />
      </template>

      <template #submissionDate-header="{ column }">
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
        />
      </template>

      <template #lastModified-header="{ column }">
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
        />
      </template>

      <template #adjudicator-header="{ column }">
        <TableHeaderSelect
          v-model="exStore.tableFilters.adjudicator"
          :column
          :sort
          searchable
          :options="[
            { label: 'Person 1', value: 'person-1' },
            { label: 'Person 2', value: 'person-2' },
            { label: 'Person 3', value: 'person-3' },
            { label: 'Person 4', value: 'person-4' },
            { label: 'Person 5', value: 'person-5' },
          ]"
        />
      </template>

      <!-- row slots -->
      <template #registrationNumber-data="{ row }">
        {{ row.registrationNumber ? `${row.registrationNumber} / ` : '' }}{{ row.applicationNumber }}
      </template>

      <template #submissionDate-data="{ row }">
        <div class="flex flex-col">
          <span>{{ dateToStringPacific(row.submissionDate) }}</span>
          <span>{{ dateToString(row.submissionDate, 't') }}</span>
        </div>
      </template>

      <template #lastModified-data="{ row }">
        <div class="flex flex-col">
          <span>{{ dateToStringPacific(row.lastModified) }}</span>
          <span>{{ dateToString(row.lastModified, 't') }}</span>
        </div>
      </template>
    </UTable>
  </div>
</template>
