<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const accountStore = useConnectAccountStore()
const strrModal = useStrrModals()
const { deleteApplication } = useStrrApi()
const { limit, page, getApplicationList } = useStrrBasePermitList<StrataApplicationResp>(ApplicationType.STRATA_HOTEL)

const columns = [
  {
    key: 'strataName',
    label: t('label.strataName'),
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
    label: t('label.daysToExpiry'),
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

const { data: strataHotelListResp, status, refresh } = await useAsyncData(
  'strata-hotel-list-resp',
  getApplicationList,
  {
    watch: [() => accountStore.currentAccount.id, limit, page],
    default: () => ({ applications: [], total: 0 })
  }
)

const mapApplicationsList = () => {
  if (!strataHotelListResp.value?.applications) {
    return []
  }
  return (strataHotelListResp.value.applications).map(app => ({
    strataName: app.registration.strataHotelDetails.brand.name,
    number: app.header.registrationNumber || app.header.applicationNumber,
    lastStatusChange: getLastStatusChangeColumn(app.header),
    daysToExpiry: getDaysToExpiryColumn(app.header),
    status: app.header.registrationStatus || app.header.hostStatus,
    applicationNumber: app.header.applicationNumber // always used for view action
  }))
}

// Shouldn't use computed here because table sorting updates it which causes issues with vue tracking
const strataList = ref(mapApplicationsList())
watch(strataHotelListResp, () => { strataList.value = mapApplicationsList() })

function manualSort (params: { column: string, direction: 'asc' | 'desc' }) {
  // FUTURE: call api - this function is temporary
  if (params.column === null) {
    // resetting sort
    strataList.value = mapApplicationsList()
  }
  const stringCompareFn = (a: string | undefined, b: string | undefined) => {
    return (a || '').toUpperCase().localeCompare((b || '').toUpperCase())
  }
  return strataList.value.sort((a, b) => stringCompareFn(
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
    await navigateTo(localePath('/strata-hotel/application?applicationId=' + row.applicationNumber))
  } else {
    await navigateTo(localePath('/strata-hotel/dashboard/' + row.applicationNumber))
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
        :label="$t('btn.addStrataHotel')"
        icon="i-mdi-plus"
        :to="localePath('/strata-hotel/application')"
      />

      <ConnectPageSection>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-normal">
              <ConnectI18nHelper
                translation-path="table.strataHotelList.title"
                :count="strataHotelListResp?.total || 0"
              />
            </h2>
            <!-- TODO: filtering post-mvp ? -->
            <!-- <UInput
              placeholder="Find"
            /> -->
            <div class="flex gap-3">
              <UPagination
                v-if="strataHotelListResp.total > limit"
                v-model="page"
                :page-count="limit"
                size="lg"
                :total="strataHotelListResp?.total || 0"
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
          :rows="strataList"
          :loading="status === 'pending' || deleting"
          :empty-state="{ icon: '', label: $t('table.strataHotelList.emptyText') }"
          :sort-button="{ // have to add this because updating ui/default/sortButton/class isn't working
            icon: 'i-heroicons-arrows-up-down-20-solid',
            trailing: true,
            square: true,
            color: 'black',
            variant: 'ghost',
            // @ts-expect-error - class is a valid field (as of nuxt/ui 2.20)
            class: 'font-bold'
          }"
          :ui="{
            wrapper: 'relative overflow-x-auto h-[512px]',
            thead: 'sticky top-0 bg-white z-10',
            th: { padding: 'p-2' },
            td: {
              base: 'whitespace-normal max-w-96 align-top overflow-hidden',
              padding: 'p-4',
              color: 'text-bcGovColor-midGray',
              font: '',
              size: 'text-sm',
            },
          }"
          @update:sort="manualSort"
        >
          <template #actions-header>
            <div class="text-center">
              <span>{{ $t('label.actions') }}</span>
            </div>
          </template>
          <!-- using a slot for this so the nuxtui sort will still sort by datetime -->
          <template #lastStatusChange-data="{ row }">
            {{ dateToStringPacific(row.lastStatusChange) }}
          </template>

          <template #daysToExpiry-data="{ row }">
            <span :class="{'font-semibold text-red-500': row.daysToExpiry.value <= 0}">
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
                  : $t('btn.ariaViewDetails', { name: row.strataName })
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
