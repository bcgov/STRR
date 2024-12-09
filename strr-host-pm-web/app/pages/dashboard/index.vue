<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const accountStore = useConnectAccountStore()
const hostPermitStore = useHostPermitStore()
const strrModal = useStrrModals()

const columns = [
  {
    key: 'name',
    label: t('label.name')
  },
  {
    key: 'address',
    label: t('label.address')
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
    class: 'max-w-28'
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
  middleware: ['auth', 'require-account']
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

// can use watch param to handle pagination in future
const { data: hostPmList, status } = await useAsyncData(
  'host-pm-list',
  () => hostPermitStore.loadHostPmList(),
  {
    watch: [() => accountStore.currentAccount.id],
    default: () => []
  }
)

async function handleItemSelect (row: any) {
  await navigateTo(localePath('/dashboard/' + row.applicationNumber))
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
        :label="$t('btn.createNewReg')"
        icon="i-mdi-plus"
        :to="localePath('/application')"
      />

      <ConnectPageSection>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-normal">
              <ConnectI18nBold translation-path="table.hostPmList.title" :count="hostPmList.length" />
            </h2>
            <!-- TODO: filtering post-mvp ? -->
            <!-- <UInput
              placeholder="Find"
            /> -->
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
        </template>
        <UTable
          ref="tableRef"
          :columns="selectedColumns"
          :rows="hostPmList"
          :loading="status === 'pending'"
          :empty-state="{ icon: '', label: $t('table.hostPmList.emptyText') }"
          :sort="{ column: 'date', direction: 'desc' }"
          :ui="{
            wrapper: 'relative overflow-x-auto h-[512px]',
            thead: 'sticky top-0 bg-white z-10',
            // th: {
            //   padding: 'px-0 py-0'
            // },
            td: {
              base: 'whitespace-normal max-w-96 align-top',
              padding: 'px-4 py-4',
              color: 'text-bcGovColor-midGray',
              font: '',
              size: 'text-sm',
            }
          }"
        >
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
            {{ dateToStringPacific(row.lastStatusChange, 'DDD') }}
          </template>

          <template #daysToExpiry-data="{ row }">
            <span :class="{'font-bold text-red-500': row.daysToExpiry.value <= 0}">
              {{ row.daysToExpiry.label }}
            </span>
          </template>

          <template #actions-data="{ row }">
            <UButton
              :label="$t('btn.view')"
              @click="handleItemSelect(row)"
            />
          </template>
        </UTable>
      </ConnectPageSection>
    </div>
  </div>
</template>
