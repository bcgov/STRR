<script setup lang="ts">
const { t } = useI18n()
const propertyStore = useHostPropertyStore()
const { unitAddress, unitDetails } = storeToRefs(propertyStore)
const { prRequirements, blRequirements } = storeToRefs(usePropertyReqStore())

// step 1 items
const exemptInfo = computed((): ConnectInfoTableItem[] => [
  { label: '', info: '', slot: 'border' },
  { label: t('label.prExemption'), info: '', slot: 'prExempt' },
  {
    label: t('label.prExemptionReason'),
    info: t(`label.exemptionReasonCode.${prRequirements.value.prExemptionReason}`)
  }
])

const blExemptInfo = computed((): ConnectInfoTableItem[] => [
  { label: '', info: '', slot: 'border' },
  { label: t('label.blExemption'), info: '', slot: 'blExempt' },
  {
    label: t('label.blExemptionReason'),
    info: blRequirements.value.blExemptReason || t('label.exemptionReasonCode.undefined')
  }
])

const propertyInfo = computed((): ConnectInfoTableItem[] => [
  { label: t('label.strUnitName'), info: unitAddress.value.address.nickname || t('text.notEntered') },
  { label: t('label.strUnitAddress'), info: '', slot: 'address' },
  ...(blRequirements.value.isBusinessLicenceExempt
    ? blExemptInfo.value
    : []
  ),
  ...(prRequirements.value.isPropertyPrExempt
    ? exemptInfo.value
    : []
  ),
  { label: '', info: '', slot: 'border' },
  { label: t('strr.label.propertyType'), info: t(`propertyType.${unitDetails.value.propertyType}`) },
  { label: t('label.typeOfSpace'), info: t(`rentalUnitType.${unitDetails.value.typeOfSpace}`) },
  { label: t('strr.label.rentalUnitSetup'), info: t(`rentalUnitSetupType.${unitDetails.value.rentalUnitSetupType}`) },
  { label: t('strr.label.numberOfRooms'), info: unitDetails.value.numberOfRoomsForRent },
  { label: '', info: '', slot: 'border' },
  { label: t('strr.label.ownershipType'), info: t(`ownershipType.${unitDetails.value.ownershipType}`) },
  { label: t('strr.label.parcelId'), info: unitDetails.value.parcelIdentifier || t('text.notEntered') }
])
</script>
<template>
  <ConnectInfoTable :items="propertyInfo">
    <template #label-border>
      <div class="h-px w-full border-b border-gray-100" />
    </template>
    <template #info-border>
      <div class="-ml-4 h-px w-full border-b border-gray-100" />
    </template>
    <template #info-address>
      <ConnectFormAddressDisplay :address="unitAddress.address" />
    </template>
    <template #info-blExempt>
      <div class="flex gap-2">
        <UIcon name="i-mdi-check" class="mt-[2px] size-4 text-green-600" />
        <p>{{ $t('text.thisPropIsExempt') }}</p>
      </div>
    </template>
    <template #info-prExempt>
      <div class="flex gap-2">
        <UIcon name="i-mdi-check" class="mt-[2px] size-4 text-green-600" />
        <p>{{ $t('text.thisPropIsExempt') }}</p>
      </div>
    </template>
  </ConnectInfoTable>
</template>
