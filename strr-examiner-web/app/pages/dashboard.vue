<script setup lang="ts">
import isEmpty from 'lodash'
import { RoutesE } from '~/enums/routes'
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
      let propertyHost = t('page.dashboardList.na')
      let propertyManager = t('page.dashboardList.na')
      let propertyAddress = ''
      if (registrationType === ApplicationType.HOST) {
        const hostApplication: ApiHostApplication = application.registration as ApiHostApplication
        applicantName = displayContactFullName(hostApplication.primaryContact) || ''
        propertyAddress = displayFullUnitAddress(hostApplication.unitAddress) || '-'
        requirements = isEmpty(hostApplication.strRequirements)
          ? t('page.dashboardList.requirements.host.none')
          : getHostPrRequirements(hostApplication)
        propertyHost = displayContactFullName(hostApplication.primaryContact) || ''
        propertyManager = getHostPropertyManager(hostApplication.propertyManager as ApiPropertyManager)
      } else if (registrationType === ApplicationType.PLATFORM) {
        const platformApplication = application.registration as ApiBasePlatformApplication
        applicantName = platformApplication.businessDetails.legalName
        propertyAddress = displayFullAddress(platformApplication.businessDetails.mailingAddress) || '-'
        requirements = t(`page.dashboardList.requirements.platform.${platformApplication.platformDetails.listingSize}`)
      } else if (registrationType === ApplicationType.STRATA_HOTEL) {
        const strataApplication = application.registration as ApiBaseStrataApplication
        applicantName = strataApplication.businessDetails.legalName
        propertyAddress = displayFullAddress(strataApplication.strataHotelDetails.location) || '-'
        // TODO: update Strata requirements once backend is ready
        requirements = '-'
      }

      return {
        applicationNumber,
        registrationNumber,
        registrationType: t(`registrationType.${registrationType}`),
        requirements,
        applicantName,
        propertyHost,
        propertyManager,
        propertyAddress,
        status: examinerStatus || status,
        submissionDate: dateToString(applicationDateTime, 'MMMM d, yyyy')
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

// Get Property Manager info for the Host application
const getHostPropertyManager = (propertyManager: ApiPropertyManager): string => {
  if (!propertyManager) { return '' }

  return propertyManager.propertyManagerType === OwnerType.INDIVIDUAL
    ? displayContactFullName(propertyManager.contact as ApiPartyWithAddress) || ''
    : propertyManager.business?.legalName || ''
}

const applications = computed(() => mapApplicationsList())

const columns = [
  { key: 'registrationNumber', label: t('page.dashboardList.columns.registrationNumber'), sortable: false },
  { key: 'registrationType', label: t('page.dashboardList.columns.registrationType'), sortable: false },
  { key: 'requirements', label: t('page.dashboardList.columns.requirements'), sortable: false },
  { key: 'applicantName', label: t('page.dashboardList.columns.applicantName'), sortable: false },
  { key: 'propertyHost', label: t('page.dashboardList.columns.propertyHost'), sortable: false },
  { key: 'propertyManager', label: t('page.dashboardList.columns.propertyManager'), sortable: false },
  { key: 'propertyAddress', label: t('page.dashboardList.columns.propertyAddress'), sortable: false },
  { key: 'status', label: t('page.dashboardList.columns.status'), sortable: false },
  { key: 'submissionDate', label: t('page.dashboardList.columns.submissionDate'), sortable: false }
]

const selectedColumns = ref([...columns])

async function handleRowSelect (row: any) {
  status.value = 'pending'
  await navigateTo(localePath(`${RoutesE.EXAMINE}/${row.applicationNumber}`))
}

</script>
<template>
  <div class="h-full space-y-8 py-8 sm:space-y-10 sm:py-10">
    <UButton
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
      :columns="selectedColumns"
      :rows="applications"
      :loading="status === 'pending'"
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
      <template #registrationNumber-data="{ row }">
        {{ row.registrationNumber ? `${row.registrationNumber} / ` : '' }}{{ row.applicationNumber }}
      </template>
    </UTable>
  </div>
</template>
