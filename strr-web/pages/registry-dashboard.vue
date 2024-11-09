<template>
  <div class="mb-[100px]">
    <BcrosTypographyH1 text="My CEU STR Registry Dashboard" />
    <BcrosTypographyH2 text="Owners STR Registration Applications" />
    <InfoModal
      :header="tRegistryDashboard('modal.contactInfo.header')"
      :open-button-label="tRegistryDashboard('modal.contactInfo.openButtonLabel')"
      :hide-contact-info="false"
      class="mb-6"
    >
      <p class="mb-10">
        {{ tRegistryDashboard('modal.contactInfo.contactUsFirstPart') }}
        <a
          :href="`${tRegistryDashboard('modal.contactInfo.informationPageLink')}`"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ tRegistryDashboard('modal.contactInfo.informationPageLabel') }}
        </a>{{ tRegistryDashboard('modal.contactInfo.contactUsSecondPart') }}
      </p>
    </InfoModal>
    <UTabs
      id="filter-applications-tabs"
      :items="filterOptions"
      class="mb-[24px] w-[630px] tabs"
      :ui="{ list: {
        height: 'h-15',
        tab: { base: 'rounded-none',
               active: 'bg-bcGovColor-nonClickable text-white',
               inactive: 'bg-white text-bcGovColor-darkGray',
               padding: 'py-6 px-0',
               size: 'text-base'
        } } }"
      @change="onTabChange"
    />
    <div class="bg-white">
      <div class="flex flex-row justify-between px-[16px] py-[14px]">
        <div>
          <UInput
            v-model="searchAppInput"
            icon="i-heroicons-magnifying-glass-20-solid"
            size="sm"
            color="white"
            :trailing="false"
            :placeholder="tRegistryDashboard('search')"
            class="w-[333px]"
            data-test-id="search-applications-input"
          />
        </div>
        <div>
          <USelectMenu
            v-model="selectedColumns"
            :options="columns"
            multiple
          >
            <template #label>
              <span>{{ tRegistryDashboard('columnsToShow') }}</span>
            </template>
          </USelectMenu>
        </div>
      </div>
      <UTable
        :loading="loading"
        :columns="selectedColumns"
        :rows="tableRows"
        sort-mode="manual"
        @update:sort="sort"
      >
        <!-- Only way to do row clicks in NuxtUI currently -->
        <template #application-data="{ row }">
          <div class="flex items-center">
            <span
              :class="{ 'cursor-pointer': isClickableRow(row.registrationType) }"
              @click="handleRowClick(row.registrationType, row.applicationNumber)"
            >
              {{ row.applicationNumber }}
            </span>
            <UButton
              v-if="row.isPaid"
              :icon="downloadingReceipts.has(row.applicationNumber) ? 'i-mdi-download' : 'i-mdi-receipt-text-outline'"
              variant="ghost"
              :disabled="downloadingReceipts.has(row.applicationNumber)"
              :aria-label="tRegistryDashboard('downloadReceipt')"
              class="h-[20px] w-[20px] ml-3 !p-0 text-blue-600"
              @click="downloadReceipt(row.applicationNumber)"
            />
          </div>
        </template>
        <template #registrationNumber-data="{ row }">
          <div class="flex items-center">
            <div
              :class="{ 'cursor-pointer': isClickableRow(row.registrationType) }"
              class="text-center min-w-[80px]"
              @click="row.registrationId
                ? handleRowClick(row.registrationType, row.registrationId, false)
                : handleRowClick(row.registrationType, row.applicationNumber)
              "
            >
              {{ row.registrationNumber }}
            </div>
          </div>
        </template>
        <template #registrationType-data="{ row }">
          <div
            :class="{ 'cursor-pointer': isClickableRow(row.registrationType) }"
            class="w-full"
            tabindex="0"
            @click="handleRowClick(row.registrationType, row.applicationNumber)"
            @keydown.enter="handleRowClick(row.registrationType, row.applicationNumber)"
            @keydown.space.prevent="handleRowClick(row.registrationType, row.applicationNumber)"
          >
            {{ row.registrationType }}
          </div>
        </template>
        <template #address-data="{ row }">
          <div class="flex items-center">
            <div
              :class="{ 'cursor-pointer': isClickableRow(row.registrationType) }"
              tabindex="0"
              @click="handleRowClick(row.registrationType, row.applicationNumber)"
              @keydown.enter="handleRowClick(row.registrationType, row.applicationNumber)"
              @keydown.space.prevent="handleRowClick(row.registrationType, row.applicationNumber)"
            >
              {{ row.propertyAddress }}
            </div>
          </div>
        </template>
        <template #applicant-name-data="{ row }">
          <div class="flex items-center">
            <div
              :class="{ 'cursor-pointer': isClickableRow(row.registrationType) }"
              tabindex="0"
              @click="handleRowClick(row.registrationType, row.applicationNumber)"
              @keydown.enter="handleRowClick(row.registrationType, row.applicationNumber)"
              @keydown.space.prevent="handleRowClick(row.registrationType, row.applicationNumber)"
            >
              {{ row.applicantName }}
            </div>
          </div>
        </template>
        <template #status-data="{ row }">
          <BcrosChip
            :key="row.status"
            :flavour="getChipFlavour(row.status)"
          />
        </template>
        <template #submission-data="{ row }">
          <div
            :class="{ 'cursor-pointer': isClickableRow(row.registrationType) }"
            class="w-full"
            tabindex="0"
            @click="handleRowClick(row.registrationType, row.applicationNumber)"
            @keydown.enter="handleRowClick(row.registrationType, row.applicationNumber)"
            @keydown.space.prevent="handleRowClick(row.registrationType, row.applicationNumber)"
          >
            {{ new Date(row.submissionDate).toLocaleDateString('en-US', { dateStyle: 'medium'}) }}
          </div>
        </template>
      </UTable>
      <div
        class="
          flex flex-row justify-between border-[#E9ECEF]
          border-t-[1px] h-[67px] px-[24px]
        "
      >
        <div v-if="totalResults !== 0" class="flex items-center">
          <span class="flex">
            {{
              `
                ${tRegistryDashboard('showing')}
                ${offset + 1} - ${maxPageResults}
                ${tRegistryDashboard('of')}
                ${totalResults}
                ${tRegistryDashboard('results')}
              `
            }}
          </span>
        </div>
        <UPagination v-if="totalResults > 10 " v-model:model-value="currentPage" :total="totalResults" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ApplicationStatusE, RegistrationTypeE } from '#imports'
import { ExaminerDashboardRowI } from '~/interfaces/examiner-dashboard-row-i'
import { HostApplicationDetailsI, PlatformApplicationDetailsI } from '~/interfaces/application-i'
import InfoModal from '~/components/common/InfoModal.vue'

const { t } = useTranslation()
const tRegistryDashboard = (translationKey: string) => t(`registryDashboard.${translationKey}`)
const { getChipFlavour } = useChipFlavour()
const { downloadReceipt, downloadingReceipts } = useDownloadReceipt()
const { getApplications, getApplicationsByStatus, getPaginatedApplications } = useApplications()
const { isExaminer } = storeToRefs(useBcrosKeycloak())

const statusFilter = ref<string>('')
const offset = ref<number>(0)
const currentPage = ref<number>(1)
const tableRows = ref<Record<string, string>[]>([])
const totalResults = ref<number>(0)
const loading = ref<boolean>(true)
const maxPageResults = ref<number>(0)
const sortDesc = ref<boolean>(false)
const sortBy = ref<string>('')
const filterOptions = ref()
const searchAppInput = ref<string>('')

const DEFAULT_STATUS: ApplicationStatusE = ApplicationStatusE.FULL_REVIEW

const isClickableRow = (registrationType: string) => registrationType !== 'Platform'

const handleRowClick = (registrationType: string, identfier: string, isApplication: boolean = true) => {
  if (!isClickableRow(registrationType)) {
    return
  }
  if (isApplication) {
    navigateToApplicationDetails(identfier)
  } else {
    navigateToRegistrationDetails(identfier)
  }
}

const sort = ({ column, direction }: { column: string, direction: string }) => {
  sortBy.value = column.replace(' ', '_').toLocaleUpperCase()
  if (column === 'submission') { sortBy.value = 'SUBMISSION_DATE' }
  sortDesc.value = direction !== 'asc'
  updateTableRows()
}

const onTabChange = (index: number) => {
  switch (index) {
    case 1:
      statusFilter.value = ApplicationStatusE.PROVISIONALLY_APPROVED
      break
    case 2:
      statusFilter.value = ''
      break
    case 0:
    default:
      statusFilter.value = DEFAULT_STATUS
  }
}

const updateFilterOptions = async () => {
  const [applications, fullReview, provisionalApproval] = await Promise.all([
    getApplications(),
    getApplicationsByStatus(ApplicationStatusE.FULL_REVIEW),
    getApplicationsByStatus(ApplicationStatusE.PROVISIONALLY_APPROVED)
  ])

  filterOptions.value = [
    {
      label: `${tRegistryDashboard('fullReview')} (${fullReview.total})`
    },
    {
      label: `${tRegistryDashboard('provisionalApproval')} (${provisionalApproval.total})`
    },
    {
      label: `${tRegistryDashboard('all')} (${applications.total})`
    }
  ]
}

const navigateToApplicationDetails = (appNumber: string) => navigateTo(`/application-details/${appNumber}`)
const navigateToRegistrationDetails = (id: number) => navigateTo(`/registration-details/${id.toString()}`)

const updateTableRows = async () => {
  loading.value = true

  const paginationObject: SearchApplicationsI = {
    status: statusFilter.value as ApplicationStatusE,
    text: searchAppInput.value,
    limit: 10,
    page: currentPage.value
  }

  const applications = await getPaginatedApplications(paginationObject)
  if (applications) {
    totalResults.value = applications.total
    tableRows.value = registrationsToTableRows(applications)
  }

  updateMaxPageResults()
  loading.value = false
}

const registrationsToTableRows = (applications: PaginatedApplicationsI): Record<string, string>[] => {
  const rows: Record<string, string>[] = []
  for (const application of applications.applications) {
    const {
      header: {
        applicationNumber,
        registrationNumber,
        registrationId,
        examinerStatus,
        status,
        applicationDateTime
      },
      registration: { registrationType }
    } = application
    let applicationType = ''
    let applicantName = ''
    let propertyAddress = ''
    if (registrationType === RegistrationTypeE.HOST) {
      const hostApplication: HostApplicationDetailsI = application.registration
      if (hostApplication.propertyManager && hostApplication.propertyManager.initiatedByPropertyManager) {
        applicationType = 'Property Manager'
      } else {
        applicationType = 'Host'
      }
      applicantName = displayContactFullName(hostApplication.primaryContact.name) || ''
      propertyAddress = formatPropertyAddress(hostApplication.unitAddress)
    } else if (registrationType === RegistrationTypeE.PLATFORM) {
      const platformApplication: PlatformApplicationDetailsI = application.registration
      applicationType = 'Platform'
      applicantName = platformApplication.businessDetails.legalName
      propertyAddress = formatPropertyAddress(platformApplication.businessDetails.mailingAddress)
    } else if (registrationType === RegistrationTypeE.STRATA_HOTEL) {
      applicationType = 'Strata Hotel'
      // Implement this once the backend supports it
    }
    const row: ExaminerDashboardRowI = {
      applicationNumber,
      registrationNumber: registrationNumber ?? '-',
      registrationId: registrationId ? registrationId.toString() : '',
      registrationType: applicationType,
      propertyAddress,
      applicantName,
      status: examinerStatus || status,
      submissionDate: applicationDateTime,
      isPaid: hasPaymentReceipt(status)
    }
    rows.push(row)
  }
  return rows
}

const formatPropertyAddress = (propertyAddress: RegistrationAddressI): string => {
  const { address, addressLineTwo, city, postalCode, province, country } = propertyAddress
  const addressPartTwo = address && addressLineTwo ? `, ${addressLineTwo}` : addressLineTwo || ''
  return `
    ${address || '-'}${addressPartTwo} ${city} ${province} ${postalCode} ${country || '-'}
  `
}

const hasPaymentReceipt = (status: string): boolean => {
  return status !== ApplicationStatusE.DRAFT && status !== ApplicationStatusE.PAYMENT_DUE
}

watch(statusFilter, () => updateTableRows())
// watch(limit, () => updateTableRows())
watch(searchAppInput, () => {
  // search with min of three characters, reset search when input is empty
  if (searchAppInput.value.length >= 3 || searchAppInput.value.length === 0) {
    updateTableRows()
  }
})

const updateMaxPageResults = () => {
  const offsetPlusTen = offset.value + 10
  maxPageResults.value = Math.min(totalResults.value, offsetPlusTen)
}

watch(currentPage, () => {
  offset.value = (currentPage.value - 1) * 10
  updateTableRows()
})

const selectedColumns = ref<{ key: string; label: string; }[]>([])

const columns = [
  { key: 'application', label: tRegistryDashboard('applicationNumber'), sortable: false },
  { key: 'registrationNumber', label: tRegistryDashboard('registrationNumber'), sortable: false },
  { key: 'registrationType', label: tRegistryDashboard('registrationType'), sortable: false },
  { key: 'address', label: tRegistryDashboard('address'), sortable: false },
  { key: 'applicantName', label: tRegistryDashboard('applicantName'), sortable: false },
  { key: 'status', label: tRegistryDashboard('status'), sortable: false },
  { key: 'submission', label: tRegistryDashboard('submissionDate'), sortable: false }
]

onBeforeMount(() => {
  // redirect Hosts to their own Dashboard
  if (!isExaminer.value) {
    navigateTo({ path: '/' + RouteNamesE.APPLICATION_STATUS })
  }
})

onMounted(async () => {
  statusFilter.value = DEFAULT_STATUS
  await updateFilterOptions()
  await updateTableRows()
  selectedColumns.value = columns
})

definePageMeta({
  layout: 'wide-no-space'
})

</script>
