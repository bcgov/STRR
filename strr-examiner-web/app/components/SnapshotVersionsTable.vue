<script lang="ts" setup>
const { t } = useNuxtApp().$i18n

defineProps<{
  snapshots: ApiSnapshot[]
}>()

const localePath = useLocalePath()

const columns = [
  { key: 'version', label: t('table.registrationSnapshots.version') },
  { key: 'date', label: t('table.registrationSnapshots.date') },
  { key: 'decision', label: t('table.registrationSnapshots.decision') },
  { key: 'assignee', label: t('table.registrationSnapshots.assignee') },
  { key: 'action', label: t('table.registrationSnapshots.action'), class: 'w-[200px]' }
]

const onViewSnapshot = async (snapshotEndpoint: string) => {
  await navigateTo(localePath(snapshotEndpoint.replace('registrations', 'registration')))
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
          {{ t('label.versions') }}
        </h3>
      </div>
    </div>
    <!-- Table -->
    <UTable
      :rows="snapshots"
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
      data-testid="snapshot-versions-table"
    >
      <template #version-data="{ row }">
        {{ row.version }}
      </template>
      <template #date-data="{ row }">
        {{ dateToString(row.snapshotDateTime, 'y-MM-dd', true) }}
      </template>
      <template #decision-data>
        -
      </template>
      <template #assignee-data>
        -
      </template>
      <template #action-data="{ row }">
        <UButton
          :label="t('btn.viewSnapshot')"
          color="primary"
          variant="solid"
          size="lg"
          class="whitespace-nowrap px-6"
          data-testid="view-snapshot-button"
          @click="onViewSnapshot(row.snapshotEndpoint)"
        />
      </template>
    </UTable>
  </div>
</template>

<style>

</style>
