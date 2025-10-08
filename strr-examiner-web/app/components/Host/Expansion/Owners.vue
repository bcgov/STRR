<script setup lang="ts">
const props = defineProps<{
  display: 'primaryContact' | 'secondaryContact' | 'propertyManager'
}>()
defineEmits<{
  close: [void]
}>()
const exStore = useExaminerStore()
const { activeReg, isApplication } = storeToRefs(exStore)

const { t } = useI18n()

const columns = [
  { key: 'name', label: t('label.name') },
  { key: 'details', label: t('label.details') },
  { key: 'additionalInfo', label: t('label.additionalInfo') },
  { key: 'role', label: t('label.role') },
  { key: 'actions' }
]

const expand = ref({
  openedRows: [] as HostOwner[],
  row: null
})

const getNameIcon = (owner: HostOwner) => {
  if (owner.ownerType === OwnerType.BUSINESS) {
    return 'i-mdi-domain'
  }
  return 'i-mdi-account'
}

const getFullName = (owner: HostOwner) => {
  return `${owner.firstName || ''} ${owner.middleName || ''} ${owner.lastName || ''}`.replaceAll('  ', ' ').trim()
}

// TODO: move to common fn for strr-base-web
const getPhoneNumber = (phone: ConnectPhone) => {
  const code = phone.countryCode ? `+${phone.countryCode}` : ''
  const number = phone.countryCode === '1'
    ? phone.number.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
    : phone.number
  const extension = phone.extension ? `Ext. ${phone.extension}` : ''
  return `${code} ${number} ${extension}`.replaceAll('  ', ' ').trim()
}

const hostOwners = computed<HostOwner[]>(() => {
  if (props.display === 'primaryContact') {
    return [formatOwnerHostUI(
      activeReg.value.primaryContact!, // there will always be a primary contact
      !activeReg.value.propertyManager?.initiatedByPropertyManager
    )]
  }
  if (props.display === 'secondaryContact') {
    return [formatOwnerHostUI(activeReg.value.secondaryContact!, false, true)]
  }
  if (props.display === 'propertyManager') {
    return [formatOwnerPropertyManagerUI(activeReg.value.propertyManager!)]
  }
  return []
})
</script>
<template>
  <!-- NOTE: - expand-button / td: { padding: 'first:p-0' } are for hiding nuxt/uis default expand column  -->
  <!--       - looks like this can be changed in nuxt/ui 3.0 because they let you place the expand column yourself -->
  <UTable
    v-model:expand="expand"
    class="h-full rounded bg-white"
    :rows="hostOwners"
    :columns="columns"
    :expand-button="{
      // @ts-expect-error, class is valid attr
      class: 'hidden'
    }"
    :ui="{ td: {
      base: 'align-text-top',
      padding: 'first:p-0'
    }}"
  >
    <template #actions-header>
      <UButton
        :label="$t('btn.close')"
        trailing-icon="i-mdi-close"
        variant="ghost"
        @click="$emit('close')"
      />
    </template>

    <template #name-data="{ row }: { row: HostOwner }">
      <ConnectInfoWithIcon :icon="getNameIcon(row)">
        <div class="*:space-y-3">
          <div v-if="row.ownerType === OwnerType.INDIVIDUAL">
            <p>{{ getFullName(row) }}</p>
            <ConnectInfoBox v-if="row.preferredName" :title="$t('label.preferredName')" :content="row.preferredName" />
            <ConnectInfoBox v-if="row.dateOfBirth" :title="$t('label.born')" :content="row.dateOfBirth" />
            <ConnectInfoBox v-if="row.taxNumber" :title="$t('label.craTaxNumber')" :content="row.taxNumber" />
            <ConnectInfoBox
              v-else
              data-testid="no-cra-tax-numner"
              class="sm:!pr-0"
              :title="$t('label.craTaxNumber')"
              :content="$t('label.noCraTaxNumber')"
            />
          </div>
          <div v-else>
            <p>{{ row.businessLegalName }}</p>
            <ConnectInfoBox
              v-if="row.businessNumber"
              :title="$t('label.craBusTaxNumber')"
              :content="row.businessNumber"
            />
          </div>
        </div>
      </ConnectInfoWithIcon>
    </template>
    <template #details-data="{ row }: { row: HostOwner }">
      <ConnectInfoWithIcon
        :icon="row.role === OwnerRole.HOST ? 'i-mdi-map-marker-outline' : 'i-mdi-email'"
      >
        <ConnectFormAddressDisplay v-if="row.mailingAddress?.country" :address="row.mailingAddress" />
      </ConnectInfoWithIcon>
      <div v-if="row.ownerType === OwnerType.INDIVIDUAL" class="mt-3 space-y-3">
        <ConnectInfoWithIcon
          v-if="getPhoneNumber(row.phone)"
          icon="i-mdi-phone"
          :content="getPhoneNumber(row.phone)"
        />
        <ConnectInfoWithIcon v-if="row.faxNumber" icon="i-mdi-fax" :content="row.faxNumber" />
        <ConnectInfoWithIcon v-if="row.emailAddress" icon="i-mdi-at" :content="row.emailAddress" />
      </div>
    </template>
    <template #additionalInfo-data="{ row }: { row: HostOwner }">
      <div class="*:space-y-3">
        <div v-if="row.ownerType === OwnerType.INDIVIDUAL">
          <ConnectInfoBox
            v-if="row.businessLegalName"
            :title="$t('label.busNameLegal')"
            :content="row.businessLegalName"
          />
          <ConnectInfoBox
            v-if="row.businessNumber"
            :title="$t('label.craBusTaxNumber')"
            :content="row.businessNumber"
          />
        </div>
        <div v-else>
          <ConnectInfoBox
            v-if="getFullName(row)"
            :title="$t('strr.label.contactIndName')"
            :content="getFullName(row)"
          />
          <ConnectInfoBox
            v-if="row.preferredName"
            :title="$t('label.preferredName')"
            :content="row.preferredName"
          />
          <!-- <div class="-ml-8 space-y-3"> -->
          <div class="space-y-3">
            <ConnectInfoWithIcon
              v-if="getPhoneNumber(row.phone)"
              icon="i-mdi-phone"
              :content="getPhoneNumber(row.phone)"
            />
            <ConnectInfoWithIcon v-if="row.faxNumber" icon="i-mdi-fax" :content="row.faxNumber" />
            <ConnectInfoWithIcon v-if="row.emailAddress" icon="i-mdi-at" :content="row.emailAddress" />
          </div>
        </div>
      </div>
    </template>
    <template #role-data="{ row }: { row: HostOwner }">
      <div class="space-y-3">
        <p v-if="isApplication && row.isCompParty">
          {{ $t('label.completingParty') }}
          ({{ getFullName(row) }})
        </p>
        <p>{{ $t(`strr.label.role.${row.role}`) }}</p>
      </div>
    </template>
  </UTable>
</template>
