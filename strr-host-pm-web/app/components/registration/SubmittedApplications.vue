<script setup lang="ts">
const { t } = useI18n()
const { getApplicationReceipt } = useStrrApi()

const props = defineProps<{
  applications: RegistrationApplication[]
}>()

const columns = [
  { key: 'details', label: t('label.details'), class: 'w-2/5' },
  { key: 'dateSubmitted', label: t('label.dateSubmitted'), class: 'w-2/5' },
  { key: 'documents', label: t('label.documents'), class: 'w-1/5' }
]

const tableUI = {
  wrapper: '',
  base: 'w-full',
  thead: 'bg-white',
  th: { padding: 'px-0 py-2', font: 'font-bold', color: 'text-gray-900', base: 'text-left border-b border-gray-200' },
  td: {
    base: 'whitespace-normal align-middle border-b border-gray-200',
    padding: 'px-0 py-4',
    color: 'text-bcGovColor-midGray',
    font: '',
    size: 'text-sm'
  },
  tbody: ''
}

const getApplicationTypeLabel = (type: string): string => {
  if (type === 'renewal') {
    return t('label.renewalApplication')
  }
  return t('label.initialApplication')
}

const downloadingReceipt = ref<string | null>(null)

const handleViewReceipt = async (applicationNumber: string) => {
  try {
    downloadingReceipt.value = applicationNumber
    const receipt = await getApplicationReceipt(applicationNumber)
    if (receipt) {
      downloadFile(receipt, `${t('word.receipt')}_${applicationNumber}.pdf`)
    }
  } finally {
    downloadingReceipt.value = null
  }
}
</script>

<template>
  <div class="px-5 pb-5">
    <UTable
      :columns="columns"
      :rows="props.applications"
      :empty-state="{ icon: '', label: t('text.noApplications') }"
      :ui="tableUI"
    >
      <template #details-data="{ row }">
        <div class="flex flex-col">
          <span class="font-bold text-gray-900">{{ getApplicationTypeLabel(row.applicationType) }}</span>
          <span>{{ t('label.applicationNumber') }}: {{ row.applicationNumber }}</span>
        </div>
      </template>

      <template #dateSubmitted-data="{ row }">
        {{ dateToStringPacific(row.applicationDateTime) }}
      </template>

      <template #documents-data="{ row }">
        <UButton
          :label="t('btn.viewReceipt')"
          :loading="downloadingReceipt === row.applicationNumber"
          variant="solid"
          color="primary"
          block
          @click="handleViewReceipt(row.applicationNumber)"
        />
      </template>
    </UTable>
  </div>
</template>
