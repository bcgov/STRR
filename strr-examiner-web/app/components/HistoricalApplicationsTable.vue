<script lang="ts" setup>
const { t } = useNuxtApp().$i18n

defineProps<{
  applications: ApiApplicationEntry[]
}>()

const localePath = useLocalePath()

const columns = [
  { key: 'number', label: t('table.historicalApps.number'), class: 'w-3/12' },
  { key: 'submitDate', label: t('table.historicalApps.submitDate'), class: 'w-full' },
  { key: 'action', label: t('table.historicalApps.action'), class: 'w-px' }
]

const isRenewal = (applicationType: string): boolean => applicationType === 'renewal'

const onViewApplication = async (applicationNumber: string) => {
  await navigateTo(localePath(`${RoutesE.EXAMINE}/${applicationNumber}`))
}

</script>

<template>
  <div class="app-inner-container mb-4">
    <!-- Header -->
    <div class="flex items-center justify-between rounded-t-lg bg-[#E2E8EE] px-6 py-4">
      <div class="flex items-center gap-2">
        <UIcon
          name="i-mdi-folder-outline"
          class="size-6 text-str-blue"
        />
        <h3 class="text-lg text-str-textGray">
          {{ t('label.applications') }}
        </h3>
      </div>
    </div>

    <!-- Table -->
    <UTable
      :rows="applications"
      :columns="columns"
      :ui="{
        wrapper: 'h-auto',
        divide: 'divide-y divide-gray-200',
        th: {
          base: 'text-sm text-gray-700',
          padding: 'px-6 py-3'
        },
        td: {
          base: 'align-middle text-sm text-gray-700 bg-white',
          padding: 'px-6'
        }
      }"
      data-testid="historical-applications-table"
    >
      <template #number-data="{ row }">
        <div class="flex flex-col">
          {{ row.applicationNumber }}
          <UBadge
            v-if="isRenewal(row.applicationType)"
            :label="t('label.renewal')"
            color="primary"
            variant="solid"
            class="mt-1 w-fit text-xs font-bold uppercase"
            data-testid="renewal-badge"
          />
        </div>
      </template>

      <template #submitDate-data="{ row }">
        {{ dateToString(row.applicationDateTime, 'y-MM-dd', true) }}
        {{ dateToString(row.applicationDateTime, 'a', true) }}
      </template>

      <template #action-data="{ row }">
        <UButton
          :label="t('btn.viewApplication')"
          color="primary"
          variant="solid"
          size="lg"
          class="whitespace-nowrap px-6"
          data-testid="view-application-button"
          @click="onViewApplication(row.applicationNumber)"
        />
      </template>
    </UTable>
  </div>
</template>
