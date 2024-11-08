<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const accountStore = useConnectAccountStore()
const strataStore = useStrrStrataStore()
const strataModal = useStrataModals()

const columns = [
  {
    key: 'hotelName',
    label: t('label.hotelName'),
    sortable: true
  },
  {
    key: 'number',
    label: t('label.number'),
    sortable: true
  },
  {
    key: 'type',
    label: t('label.type'),
    sortable: true
  },
  {
    key: 'date',
    label: t('label.date'),
    sortable: true
  },
  {
    key: 'status',
    label: t('label.status'),
    sortable: true
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
  { label: t('label.bcregDash'), to: useRuntimeConfig().public.registryHomeURL + 'dashboard' },
  { label: t('page.dashboardList.h1') }
])

// can use watch param to handle pagination in future
const { data: strataHotelList, status } = await useAsyncData(
  'strata-hotel-list',
  () => strataStore.loadStrataHotelList(),
  { watch: [() => accountStore.currentAccount.id] }
)

async function handleItemSelect (row: any) {
  const identifier = row.id ?? row.number // id only exists in the registration objects
  await navigateTo(localePath('/strata-hotel/dashboard/' + identifier))
}
</script>
<template>
  <div class="space-y-8 py-8 sm:space-y-10 sm:py-10">
    <div class="space-y-4">
      <ConnectTypographyH1 :text="$t('page.dashboardList.h1')" />
      <p>{{ $t('page.dashboardList.subtitle') }}</p>
      <UButton
        :label="$t('modal.helpRegisteringStrata.triggerBtn')"
        :padded="false"
        variant="link"
        @click="strataModal.openhelpRegisteringStrataModal()"
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
              <ConnectI18nBold translation-path="table.strataHotelList.title" :count="strataHotelList.length" />
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
          :columns="selectedColumns"
          :rows="strataHotelList"
          :loading="status === 'pending'"
          :empty-state="{ icon: 'i-heroicons-circle-stack-20-solid', label: $t('table.strataHotelList.emptyText') }"
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
            },
          }"
        >
          <!-- using a slot for this so the nuxtui sort will still sort by datetime -->
          <template #date-data="{ row }">
            {{ dateToStringPacific(row.date, 'MMMM Do, YYYY') }}
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
