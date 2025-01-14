<script setup lang="ts">
import { RoutesE } from '~/enums/routes'
import type { HostApplicationResp } from '~/interfaces/host-i'
import type { ApiBasePlatformApplication, PlatformApplicationResp } from '~/interfaces/platform-i'
import type { StrataApplicationResp } from '~/interfaces/strata-i'
import { displayFullUnitAddress } from '~/utils/format-helper'

const localePath = useLocalePath()
const { t } = useI18n()
// TODO: ApplicationStatus.FULL_REVIEW is temporary until we have reqs defined
const { limit, page, getApplicationList } = useStrrBasePermitList(undefined, ApplicationStatus.FULL_REVIEW)

useHead({
  title: t('page.dashboardList.title')
})

definePageMeta({
  layout: 'examiner',
  middleware: ['auth', 'require-account']
})

const HOST_TYPE = 'Host'
const PROPERTY_MANAGER_TYPE = 'Property Manager'
const STRATA_HOTEL_TYPE = 'Strata Hotel'
const PLATFORM_TYPE = 'Platform'

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

      let applicationType = ''
      let applicantName = ''
      let propertyAddress = ''
      if (registrationType === ApplicationType.HOST) {
        const hostApplication: ApiHostApplication = application.registration as ApiHostApplication
        if (hostApplication.propertyManager && hostApplication.propertyManager.initiatedByPropertyManager) {
          applicationType = PROPERTY_MANAGER_TYPE
        } else {
          applicationType = HOST_TYPE
        }
        applicantName = displayContactFullName(hostApplication.primaryContact) || ''
        propertyAddress = displayFullUnitAddress(hostApplication.unitAddress) || '-'
      } else if (registrationType === ApplicationType.PLATFORM) {
        const platformApplication = application.registration as ApiBasePlatformApplication
        applicationType = PLATFORM_TYPE
        applicantName = platformApplication.businessDetails.legalName
        propertyAddress = displayFullAddress(platformApplication.businessDetails.mailingAddress) || '-'
      } else if (registrationType === ApplicationType.STRATA_HOTEL) {
        const strataApplication = application.registration as ApiBaseStrataApplication
        applicationType = STRATA_HOTEL_TYPE
        const { firstName, middleName, lastName } = strataApplication.completingParty
        applicantName = displayContactFullName({ firstName, middleName, lastName }) || '-'
        propertyAddress = displayFullAddress(strataApplication.strataHotelDetails.location) || '-'
      }

      return {
        applicationNumber,
        registrationNumber: registrationNumber ?? '-',
        registrationType: applicationType,
        propertyAddress,
        applicantName,
        status: examinerStatus || status,
        isPaid: status !== 'DRAFT' && status !== 'PAYMENT_DUE',
        submissionDate: dateToString(applicationDateTime, 'MMMM d, yyyy')
      }
    })
}
const applications = computed(() => mapApplicationsList())

const columns = [
  { key: 'applicationNumber', label: 'Application Number', sortable: false },
  { key: 'registrationNumber', label: 'Registration Number', sortable: false },
  { key: 'registrationType', label: 'Type', sortable: false },
  { key: 'propertyAddress', label: 'Address', sortable: false },
  { key: 'applicantName', label: 'Applicant Name', sortable: false },
  { key: 'status', label: 'Status', sortable: false },
  { key: 'submissionDate', label: 'Submission Date', sortable: false },
  { key: 'actions', label: t('label.actions') }
]

const selectedColumns = ref([...columns])

async function handleItemSelect (row: any) {
  await navigateTo(localePath(`${RoutesE.EXAMINE}/${row.applicationNumber}`))
}

</script>
<template>
  <div class="h-full space-y-8 py-8 sm:space-y-10 sm:py-10">
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
      :columns="selectedColumns"
      :rows="applications"
      :loading="status === 'pending'"
      :ui="{
        wrapper: 'relative overflow-x-auto h-[512px]',
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
    >
      <template #actions-data="{ row }">
        <UButton :label="$t('btn.view')" @click="handleItemSelect(row)" />
      </template>
    </UTable>
  </div>
</template>
