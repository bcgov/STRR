<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  totalFilteredApplications: number
  page: number
  applicationsLimit: number
  paginationUI: any
  applicationsColumns: any[]
  applicationsList: any[]
  applicationsStatus: string
  tableUI: any
  deleting: boolean
}>()

const emit = defineEmits<{
  'update:page': [value: number]
  select: [row: any]
  'delete-draft': [row: any]
}>()

const currentPage = computed({
  get: () => props.page,
  set: (value: number) => emit('update:page', value)
})

const handleSelect = (row: any) => {
  emit('select', row)
}

const handleDeleteDraft = (row: any) => {
  emit('delete-draft', row)
}
</script>

<template>
  <ConnectPageSection>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="font-normal">
          {{ $t('page.dashboardList.applicationsInProgress') }} ({{ totalFilteredApplications }})
        </h2>
        <div class="flex gap-3">
          <UPagination
            v-if="totalFilteredApplications > applicationsLimit"
            v-model="currentPage"
            :page-count="applicationsLimit"
            size="lg"
            :total="totalFilteredApplications"
            :ui="paginationUI"
          />
        </div>
      </div>
    </template>
    <UTable
      :columns="applicationsColumns"
      :rows="applicationsList"
      :loading="applicationsStatus === 'pending' || deleting"
      :empty-state="{ icon: '', label: t('page.dashboardList.noApplicationsInProgress') }"
      :ui="tableUI"
    >
      <template #address-data="{ row }">
        <div class="flex flex-col">
          <span>
            {{
              `${row.address.unitNumber ? row.address.unitNumber + '-' : ''}${
                row.address.streetNumber
              } ${row.address.streetName}`
            }}
          </span>
          <span>{{ row.address.city }}</span>
        </div>
      </template>

      <template #dateSubmitted-data="{ row }">
        {{ dateToStringPacific(row.dateSubmitted) }}
      </template>

      <template #actions-data="{ row }">
        <div class="flex flex-col gap-px lg:flex-row">
          <UButton
            :class="row.status === 'Draft' ? 'justify-center grow lg:rounded-r-none' : ''"
            :label="row.status === 'Draft' ? $t('label.resumeDraft') : $t('btn.view')"
            :block="row.status !== 'Draft'"
            :disabled="row.disabled"
            @click="handleSelect(row)"
          />
          <UPopover v-if="row.status === 'Draft'" :popper="{ placement: 'bottom-end' }">
            <UButton
              class="grow justify-center lg:flex-none lg:rounded-l-none"
              icon="i-mdi-menu-down"
              :aria-label="$t('text.showMoreOptions')"
              :disabled="row.disabled"
            />
            <template #panel>
              <UButton
                class="m-2"
                :label="$t('btn.deleteApplication')"
                variant="link"
                @click="handleDeleteDraft(row)"
              />
            </template>
          </UPopover>
        </div>
      </template>
    </UTable>
  </ConnectPageSection>
</template>
