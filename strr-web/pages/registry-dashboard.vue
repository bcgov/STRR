<template>
  <div class="mb-[100px]">
    <BcrosTypographyH1 text="My CEU STR Registry Dashboard" />
    <BcrosTypographyH2 text="Owners STR Registration Applications" />
    <UTabs
      :items="filterOptions"
      class="mb-[24px] w-[800px] tabs"
      :ui="{ list: { tab: { active: 'bg-bcGovColor-nonClickable text-white' } } }"
      @change="onTabChange"
    />
    <div class="bg-white">
      <div class="flex flex-row justify-between px-[16px] py-[14px]">
        <div>
          <UInput
            v-model="search"
            icon="i-heroicons-magnifying-glass-20-solid"
            size="sm"
            color="white"
            :trailing="false"
            :placeholder="tRegistryDashboard('search')"
            class="w-[333px]"
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
        <template #registration-data="{ row }">
          <div class="cursor-pointer w-full" @click="navigateToDetails(row.registration)">
            {{ row.registration }}
          </div>
        </template>
        <template #location-data="{ row }">
          <div class="cursor-pointer w-full" @click="navigateToDetails(row.registration)">
            {{ row.location }}
          </div>
        </template>
        <template #address-data="{ row }">
          <div class="cursor-pointer w-full" @click="navigateToDetails(row.registration)">
            {{ row.address }}
          </div>
        </template>
        <template #owner-data="{ row }">
          <div class="cursor-pointer w-full" @click="navigateToDetails(row.registration)">
            {{ row.owner }}
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
            class="cursor-pointer w-full"
            @click="navigateToDetails(row.registration)"
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
        <UPagination v-if="totalResults > 10 " v-model:model-value="page" :total="totalResults" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PaginatedRegistrationsI } from '~/interfaces/paginated-registrations-i'
import { PaginationI } from '~/interfaces/pagination-i'

const t = useNuxtApp().$i18n.t
const tRegistryDashboard = (translationKey: string) => t(`registryDashboard.${translationKey}`)
const { getChipFlavour } = useChipFlavour()

const { getPaginatedRegistrations, getCountsByStatus } = useRegistrations()
const statusFilter = ref<string>('')
const limit = ref<number>(10)
const offset = ref<number>(0)
const page = ref<number>(1)
const tableRows = ref<Record<string, string>[]>([])
const totalResults = ref<number>(0)
const loading = ref<boolean>(true)
const maxPageResults = ref<number>(0)
const statusCounts = ref<{
  'APPROVED': number,
  'UNDER_REVIEW': number,
  'PROVISIONAL': number
}>()
const sortDesc = ref<boolean>(false)
const sortBy = ref<string>('')
const filterOptions = ref()
const search = ref('')

const sort = ({ column, direction }: { column: string, direction: string }) => {
  sortBy.value = column.replace(' ', '_').toLocaleUpperCase()
  if (column === 'submission') { sortBy.value = 'SUBMISSION_DATE' }
  sortDesc.value = direction !== 'asc'
  updateTableRows()
}

const onTabChange = (index: number) => {
  switch (index) {
    case 1:
      statusFilter.value = 'UNDER_REVIEW'
      break
    case 2:
      statusFilter.value = 'PROVISIONAL'
      break
    default:
      statusFilter.value = ''
  }
}

const updateFilterOptions = () => {
  filterOptions.value = [
    {
      label: `${tRegistryDashboard('all')} (${totalResults.value})`
    },
    {
      label: `${tRegistryDashboard('fullReview')} (${statusCounts.value?.UNDER_REVIEW})`
    },
    {
      label: `${tRegistryDashboard('provisionalApproval')} (${statusCounts.value?.PROVISIONAL})`
    }
  ]
}

watch(statusCounts, () => {
  updateFilterOptions()
})

const navigateToDetails = (id: number) => navigateTo(`/application-details/${id.toString()}`)

const addOrDeleteRefFromObject = (ref: Ref, key: keyof PaginationI, paginationObject: PaginationI) => {
  if (ref.value) {
    if (page.value !== 0) { page.value = 1 }
    paginationObject[key] = ref.value
  } else {
    delete paginationObject[key]
  }
}

const addOrDeleteSearchRefFromObject = (ref: Ref, key: keyof PaginationI, paginationObject: PaginationI) => {
  if (ref.value && ref.value.length >= 3) {
    if (page.value !== 0) { page.value = 1 }
    paginationObject[key] = `%${ref.value}%`
  } else {
    delete paginationObject[key]
  }
}

const updateTableRows = async () => {
  const paginationObject: PaginationI = {
    limit: limit.value.toString(),
    offset: offset.value.toString()
  }

  addOrDeleteRefFromObject(statusFilter, 'filter_by_status', paginationObject)
  addOrDeleteRefFromObject(sortBy, 'sort_by', paginationObject)
  addOrDeleteRefFromObject(sortDesc, 'sort_desc', paginationObject)
  addOrDeleteSearchRefFromObject(search, 'search', paginationObject)

  const registrations = await getPaginatedRegistrations(paginationObject)
  if (registrations) {
    totalResults.value = registrations.count
    tableRows.value = registrationsToTableRows(registrations)
  }
  updateMaxPageResults()
  loading.value = false
}

const registrationsToTableRows = (registrations: PaginatedRegistrationsI): Record<string, string>[] => {
  const rows: Record<string, string>[] = []
  registrations.results.forEach((result: RegistrationI) => {
    rows.push({
      registration: result.id.toString(),
      location: result.unitAddress.city,
      address: result.unitAddress.address,
      owner: `
        ${result.primaryContact.name.firstName}
        ${result.primaryContact.name.middleName ?? ''}
        ${result.primaryContact.name.lastName}
      `,
      status: result.status,
      submissionDate: result.submissionDate
    })
  })
  return rows
}

watch(statusFilter, () => updateTableRows())
watch(limit, () => updateTableRows())
watch(search, () => updateTableRows())

const updateMaxPageResults = () => {
  const offsetPlusTen = offset.value + 10
  if (totalResults.value >= offsetPlusTen) {
    maxPageResults.value = offsetPlusTen
  } else {
    maxPageResults.value = totalResults.value
  }
}

watch(page, () => {
  offset.value = (page.value - 1) * 10
  updateTableRows()
})

const selectedColumns = ref<{ key: string; label: string; }[]>([])

const columns = [
  { key: 'registration', label: tRegistryDashboard('registrationNumber'), sortable: true },
  { key: 'location', label: tRegistryDashboard('location'), sortable: true },
  { key: 'address', label: tRegistryDashboard('address'), sortable: true },
  { key: 'owner', label: tRegistryDashboard('owner'), sortable: true },
  { key: 'status', label: tRegistryDashboard('status'), sortable: true },
  { key: 'submission', label: tRegistryDashboard('submissionDate'), sortable: true }
]

const updateStatusCounts = async () => {
  statusCounts.value = await getCountsByStatus() as { APPROVED: number; UNDER_REVIEW: number; PROVISIONAL: number; }
}

onMounted(() => {
  updateTableRows()
  selectedColumns.value = columns
  updateStatusCounts()
})

definePageMeta({
  layout: 'wide-no-space'
})

</script>
