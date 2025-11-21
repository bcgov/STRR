<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  registrationsResp: any
  registrationsLimit: number
  page: number
  paginationUI: any
  registrationsColumns: any[]
  registrationsList: any[]
  registrationsStatus: string
  tableUI: any
}>()

const emit = defineEmits<{
  'update:page': [value: number]
  select: [row: any]
}>()

const currentPage = computed({
  get: () => props.page,
  set: (value: number) => emit('update:page', value)
})

const handleSelect = (row: any) => {
  emit('select', row)
}
</script>

<template>
  <ConnectPageSection>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="font-normal">
          {{ $t('page.dashboardList.myShortTermRentals') }} ({{ registrationsResp?.total || 0 }})
        </h2>
        <div class="flex gap-3">
          <UPagination
            v-if="(registrationsResp?.total || 0) > registrationsLimit"
            v-model="currentPage"
            :page-count="registrationsLimit"
            size="lg"
            :total="registrationsResp?.total || 0"
            :ui="paginationUI"
          />
        </div>
      </div>
    </template>
    <UTable
      :columns="registrationsColumns"
      :rows="registrationsList"
      :loading="registrationsStatus === 'pending'"
      :empty-state="{ icon: '', label: t('page.dashboardList.noRegistrationsFound') }"
      :ui="tableUI"
    >
      <template #number-data="{ row }">
        <div class="flex flex-col gap-1">
          <span>{{ row.number }}</span>
          <div class="flex gap-1">
            <UBadge
              v-if="row.hasRenewalDraft"
              color="blue"
              variant="subtle"
              size="xs"
              class="text-xs"
            >
              {{ $t('page.dashboardBadges.renewalDraft') }}
            </UBadge>
            <UBadge
              v-if="row.hasRenewalInProgress"
              color="blue"
              variant="subtle"
              size="xs"
              class="text-xs"
            >
              {{ $t('page.dashboardBadges.renewalInProgress') }}
            </UBadge>
          </div>
        </div>
      </template>

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

      <template #expiryDate-data="{ row }">
        <span :class="{'font-bold text-red-500': row.isExpiryCritical}">
          {{ row.expiryDate ? dateToStringPacific(row.expiryDate) : t('text.notAvailable') }}
        </span>
      </template>

      <template #actions-data="{ row }">
        <UButton
          :label="$t('btn.view')"
          block
          @click="handleSelect(row)"
        />
      </template>
    </UTable>
  </ConnectPageSection>
</template>
