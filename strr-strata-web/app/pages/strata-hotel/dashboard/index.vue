<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

const columns = [
  {
    key: 'hotelName',
    label: 'Hotel Name',
    sortable: true
  },
  {
    key: 'number',
    label: 'Number',
    sortable: true
  },
  {
    key: 'type',
    label: 'Type',
    sortable: true
  },
  {
    key: 'location',
    label: 'Location',
    sortable: true
  },
  {
    key: 'completingParty',
    label: 'Completing Party',
    sortable: true
  },
  {
    key: 'dateRegistered',
    label: 'Date Registered',
    sortable: true
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true
  },
  {
    key: 'actions',
    label: 'Actions'
  }
]

const selectedColumns = ref([...columns])

const people = [
  {
    id: Math.random(),
    hotelName: 'The Manor',
    number: 'RP12345678',
    type: 'Registration',
    location: 'Kelowna',
    completingParty: 'James Halpert',
    dateRegistered: '2024-11-29',
    status: 'Active'
  },
  {
    id: Math.random(),
    hotelName: 'The Parkview',
    number: 'AP134234',
    type: 'Application',
    location: 'Vancouver',
    completingParty: 'Andrew Bernard',
    dateRegistered: '2024-11-29',
    status: 'Pending adjudication'
  }
]

// page stuff
useHead({
  title: t('strr.title.default')
})

definePageMeta({
  middleware: ['auth']
})

setBreadcrumbs([
  { label: t('label.bcregDash'), to: useRuntimeConfig().public.registryHomeURL + 'dashboard' },
  { label: t('strr.title.default') }
])

const strataStore = useStrrStrataStore()
onMounted(async () => {
  await strataStore.loadStrataHotelList()
})

// Make row selectable with @select event?
// function select (row) {
//   console.log('handle select: ', row)
//   // const index = selected.value.findIndex(item => item.id === row.id)
//   // if (index === -1) {
//   //   selected.value.push(row)
//   // } else {
//   //   selected.value.splice(index, 1)
//   // }
// }
</script>
<template>
  <div class="space-y-8 py-8 sm:space-y-10 sm:py-10">
    <div class="space-y-4">
      <ConnectTypographyH1 text="My Short Term Rental Registry" />
      <p>Register and keep short-term rental unit information up to date.</p>
      <UButton
        label="Help with registering and managing short-term rentals"
        :padded="false"
        variant="link"
        @click="() => console.log('help text clicked')"
      />
    </div>

    <div class="space-y-4">
      <UButton
        label="Add a strata hotel"
        icon="i-mdi-plus"
        :to="localePath('/strata-hotel/application')"
      />

      <ConnectPageSection>
        <template #header>
          <div class="flex items-center justify-between">
            <h2>My Strata Hotel List (2)</h2>
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
          :rows="[...people, ...people, ...people, ...people, ...people, ...people]"
          :empty-state="{ icon: 'i-heroicons-circle-stack-20-solid', label: $t('labels.noAffiliationRecords') }"
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
          <template #actions-data="{ row }">
            <UButton
              label="View Details"
              @click="navigateTo(localePath('/strata-hotel/dashboard/' + row.id))"
            />
          </template>
        </UTable>
      </ConnectPageSection>
    </div>
  </div>
</template>
