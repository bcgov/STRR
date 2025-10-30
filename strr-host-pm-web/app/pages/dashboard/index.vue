<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const accountStore = useConnectAccountStore()
const strrModal = useStrrModals()
const { deleteApplication } = useStrrApi()
const { checkBusinessLicenseRequirement } = useHostPermitStore()
const {
  limit,
  page,
  includeDraftRegistration,
  includeDraftRenewal,
  getApplicationList
} = useStrrBasePermitList<HostApplicationResp>(ApplicationType.HOST)

includeDraftRegistration.value = true
includeDraftRenewal.value = false

const columns = [
  {
    key: 'name',
    label: t('label.name'),
    sortable: true
  },
  {
    key: 'address',
    label: t('label.address'),
    sortable: true
  },
  {
    key: 'number',
    label: t('label.number'),
    sortable: true
  },
  {
    key: 'status',
    label: t('label.status'),
    sortable: true
  },
  {
    key: 'lastStatusChange',
    label: t('label.lastStatusChange'),
    sortable: true
  },
  {
    key: 'daysToExpiry',
    label: t('label.daysToExpiryExtra'),
    sortable: true,
    class: 'w-40'
  },
  {
    key: 'actions',
    label: t('label.actions')
  }
]

const selectedColumns = ref([...columns])

// page stuff
useHead({
  title: t('page.dashboardList.title')
})

definePageMeta({
  middleware: ['auth', 'check-tos', 'require-account']
})

setBreadcrumbs([
  {
    label: t('label.bcregDash'),
    to: useRuntimeConfig().public.registryHomeURL + 'dashboard',
    appendAccountId: true,
    external: true
  },
  { label: t('page.dashboardList.h1') }
])

const { data: hostPmListResp, status, refresh } = await useAsyncData(
  'host-pm-list-resp',
  getApplicationList,
  {
    watch: [() => accountStore.currentAccount.id, limit, page],
    default: () => ({ applications: [], total: 0 })
  }
)

const hasRegistrationNOC = (header: ApplicationHeader): boolean => {
  return header.registrationNocStatus === RegistrationNocStatus.NOC_PENDING
}

const needsAttention = (app: any): boolean => {
  return checkBusinessLicenseRequirement(app)
}

const mapApplicationsList = () => {
  if (!hostPmListResp.value?.applications) {
    return []
  }
  return (hostPmListResp.value.applications)
    .map((app: any) => {
      const displayAddress = app.header.registrationAddress || app.registration.unitAddress
      return {
        name: app.registration.unitAddress?.nickname || t('label.unnamed'),
        address: displayAddress,
        number: app.header.registrationNumber || app.header.applicationNumber,
        lastStatusChange: getLastStatusChangeColumn(app.header),
        daysToExpiry: getDaysToExpiryColumn(app.header),
        status: getApplicationStatus(app.header),
        applicationNumber: app.header.applicationNumber, // always used for view action
        hasRegistrationNoc: hasRegistrationNOC(app.header),
        needsAttention: needsAttention(app)
      }
    })
}

// Shouldn't use computed here because table sorting updates it which causes issues with vue tracking
const hostPmList = ref(mapApplicationsList())
watch(hostPmListResp, () => { hostPmList.value = mapApplicationsList() })

function manualSort (params: { column: string, direction: 'asc' | 'desc' }) {
  // FUTURE: call api - this function is temporary
  if (params.column === null) {
    // resetting sort
    hostPmList.value = mapApplicationsList()
  }
  const stringCompareFn = (a: string | undefined, b: string | undefined) => {
    return (a || '').toUpperCase().localeCompare((b || '').toUpperCase())
  }
  const getAddressString = (address: ApiUnitAddress | undefined) => {
    return [
      address?.unitNumber,
      address?.streetNumber,
      address?.streetName,
      address?.city].filter(val => !!val).join() || ''
  }
  if (params.column === 'address') {
    return hostPmList.value.sort((a, b) => stringCompareFn(
      params.direction === 'asc' ? getAddressString(a.address) : getAddressString(b.address),
      params.direction === 'asc' ? getAddressString(b.address) : getAddressString(a.address)))
  }
  if (params.column === 'daysToExpiry') {
    return hostPmList.value.sort((a, b) => stringCompareFn(
      params.direction === 'asc' ? a.daysToExpiry.label : b.daysToExpiry.label,
      params.direction === 'asc' ? b.daysToExpiry.label : a.daysToExpiry.label
    ))
  }
  return hostPmList.value.sort((a, b) => stringCompareFn(
    // @ts-expect-error - 'a[params.column]' should always be a string or undefined
    params.direction === 'asc' ? a[params.column] : b[params.column],
    // @ts-expect-error - 'b[params.column]' should always be a string or undefined
    params.direction === 'asc' ? b[params.column] : a[params.column]
  ))
}

function isDraft (status: string) {
  return status === 'Draft'
}

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
    refresh()
    deleting.value = false
  }
}

async function handleItemSelect (row: any) {
  if (isDraft(row.status)) {
    await navigateTo(localePath('/application?applicationId=' + row.applicationNumber))
  } else {
    await navigateTo(localePath('/dashboard/' + row.applicationNumber))
  }
}
</script>
<template>
  <div class="space-y-8 py-8 sm:space-y-10 sm:py-10">
    <div class="space-y-4">
      <ConnectTypographyH1 :text="$t('page.dashboardList.h1')" />
      <p>{{ $t('page.dashboardList.subtitle') }}</p>
      <UButton
        :label="$t('modal.help.registerStr.triggerBtn')"
        :padded="false"
        icon="i-mdi-help-circle-outline"
        variant="link"
        @click="strrModal.openHelpRegisterModal()"
      />
    </div>

    <div class="space-y-4">
      <UButton
        :label="$t('btn.registerAStr')"
        icon="i-mdi-plus"
        :to="localePath('/application')"
      />

      <ConnectPageSection>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-normal">
              <ConnectI18nHelper translation-path="table.hostPmList.title" :count="hostPmListResp?.total || 0" />
            </h2>
            <!-- TODO: filtering post-mvp ? -->
            <!-- <UInput
              placeholder="Find"
            /> -->
            <div class="flex gap-3">
              <UPagination
                v-if="hostPmListResp?.total > limit"
                v-model="page"
                :page-count="limit"
                size="lg"
                :total="hostPmListResp?.total || 0"
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
          </div>
        </template>
        <UTable
          ref="tableRef"
          :columns="selectedColumns"
          :rows="hostPmList"
          :loading="status === 'pending' || deleting"
          :empty-state="{ icon: '', label: $t('table.hostPmList.emptyText') }"
          :sort-button="{ // have to add this because updating ui/default/sortButton/class isn't working
            icon: 'i-heroicons-arrows-up-down-20-solid',
            trailing: true,
            square: true,
            color: 'black',
            variant: 'ghost',
            // @ts-expect-error - class is a valid field (as of nuxt/ui 2.20)
            class: 'font-bold'
          }"
          sort-mode="manual"
          :ui="{
            wrapper: 'relative overflow-x-auto h-[512px]',
            thead: 'sticky top-0 bg-white z-10',
            th: { padding: 'p-2' },
            td: {
              base: 'whitespace-normal max-w-96 align-top',
              padding: 'p-4',
              color: 'text-bcGovColor-midGray',
              font: '',
              size: 'text-sm',
            }
          }"
          @update:sort="manualSort"
        >
          <template #actions-header>
            <div class="text-center">
              <span>{{ t('label.actions') }}</span>
            </div>
          </template>

          <template #status-data="{ row }">
            <div class="flex items-center gap-1">
              <span>{{ row.status }}</span>
              <UTooltip
                v-if="row.hasRegistrationNoc || row.needsAttention"
                :text="$t('tooltip.needsAttention')"
                :popper="{
                  placement: 'right',
                  arrow: true
                }"
              >
                <UIcon
                  name="i-mdi-alert"
                  class="size-5 shrink-0 bg-orange-600"
                />
              </UTooltip>
            </div>
          </template>
          <template #address-data="{ row }">
            <div class="flex flex-col">
              <span>
                <!-- eslint-disable-next-line max-len -->
                {{ `${row.address.unitNumber ? row.address.unitNumber + '-' : ''}${row.address.streetNumber} ${row.address.streetName}` }}
              </span>
              <span>
                {{ row.address.city }}
              </span>
            </div>
          </template>

          <!-- using a slot for this so the nuxtui sort will still sort by datetime -->
          <template #lastStatusChange-data="{ row }">
            {{ dateToStringPacific(row.lastStatusChange) }}
          </template>

          <template #daysToExpiry-data="{ row }">
            <span :class="{'font-bold text-red-500': row.daysToExpiry.value <= 0}">
              {{ row.daysToExpiry.label }}
            </span>
          </template>

          <template #actions-data="{ row }">
            <div class="flex flex-col gap-px lg:flex-row">
              <UButton
                :class="isDraft(row.status) ? 'justify-center grow lg:rounded-r-none' : ''"
                :label="isDraft(row.status) ? $t('label.resumeDraft') : $t('btn.view')"
                :aria-label="isDraft(row.status)
                  ? $t('btn.ariaResumeDraft', { number: row.applicationNumber })
                  : $t('btn.ariaViewDetails', {
                    name: row.name,
                    address: `${row.address.unitNumber
                      ? row.address.unitNumber + '-'
                      : ''}${row.address.streetNumber} ${row.address.streetName}, ${row.address.city}`
                  })
                "
                :block="!isDraft(row.status)"
                :disabled="row.disabled"
                @click="handleItemSelect(row)"
              />
              <UPopover v-if="isDraft(row.status)" :popper="{ placement: 'bottom-end' }">
                <UButton
                  class="grow justify-center lg:flex-none lg:rounded-l-none"
                  icon="i-mdi-menu-down"
                  :aria-label="$t('text.showMoreOptions')"
                  :disabled="row.disabled"
                />
                <template #panel>
                  <!-- TODO: not focusable via keyboard tab, should be fixed in nuxt/ui v3 -->
                  <UButton
                    class="m-2"
                    :label="$t('btn.deleteApplication')"
                    :aria-label="$t('btn.deleteApplication')"
                    variant="link"
                    @click="deleteDraft(row)"
                  />
                </template>
              </UPopover>
            </div>
          </template>
        </UTable>
      </ConnectPageSection>
    </div>
  </div>
</template>
