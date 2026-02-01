<script setup lang="ts">
const { t } = useNuxtApp().$i18n
const propertyStore = useHostPropertyStore()
const { unitAddress, unitDetails } = storeToRefs(propertyStore)
const { prRequirements, blRequirements, strataHotelCategory } = storeToRefs(usePropertyReqStore())
const { isNewRentalUnitSetupEnabled } = useHostFeatureFlags()

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

const isExemptionReasonStrata = computed((): boolean =>
  prRequirements.value.prExemptionReason === PrExemptionReason.STRATA_HOTEL)

const strataHotelInfo = computed((): ConnectInfoTableItem[] =>
  isExemptionReasonStrata.value
    ? [
        {
          label: t('label.StrataHotelCategory'),
          info: t(`strataHotelCategoryReview.${strataHotelCategory.value.category}`)
        }
      ]
    : []
)

const parcelId = computed((): ConnectInfoTableItem[] => [
  { label: t('strr.label.parcelId'), info: unitDetails.value.parcelIdentifier || t('text.notEntered') }
])

const strataHotelRegistrationNumber = computed((): ConnectInfoTableItem[] =>
  isNewRentalUnitSetupEnabled.value && isExemptionReasonStrata.value
    ? [
        {
          label: t('strr.label.strataPlatformRegistrationNumber'),
          info: strataHotelCategory.value.strataHotelRegistrationNumber || t('text.notEntered')
        }
      ]
    : []
)

const propertyType = computed((): ConnectInfoTableItem[] => [
  {
    label:
    (isNewRentalUnitSetupEnabled.value
      ? t('strr.label.strRentalType')
      : t('strr.label.propertyType')),
    info: t(`propertyType.${unitDetails.value.propertyType}`)
  }])

const newRentalSetupType = computed((): ConnectInfoTableItem[] =>
  isNewRentalUnitSetupEnabled.value
    ? [
        {
          label: t('strr.label.hostType'),
          info: t(`propertyHostType.${unitDetails.value.hostType}`)
        },
        {
          label: t('strr.label.rentalUnitSetup'),
          info: t(`rentalUnitSetupOption.${unitDetails.value.rentalUnitSetupOption}.label`)
        }
      ]
    : []
)

const propertyInfo = computed((): ConnectInfoTableItem[] => [
  { label: t('label.strUnitName'), info: unitAddress.value.address.nickname || t('text.notEntered') },
  { label: t('label.strUnitAddress'), info: '', slot: 'address' },
  ...(isNewRentalUnitSetupEnabled.value ? parcelId.value : []),
  ...(blRequirements.value.isBusinessLicenceExempt
    ? blExemptInfo.value
    : []
  ),
  ...(prRequirements.value.isPropertyPrExempt
    ? exemptInfo.value
    : []
  ),
  ...strataHotelInfo.value,
  ...strataHotelRegistrationNumber.value,
  { label: '', info: '', slot: 'border' },
  ...propertyType.value,
  ...newRentalSetupType.value,
  ...(!isNewRentalUnitSetupEnabled.value
    ? [
        { label: t('label.typeOfSpace'), info: t(`rentalUnitType.${unitDetails.value.typeOfSpace}`) },
        { label: t('strr.label.rentalUnitSetup'), info: t(`rentalUnitSetupType.${unitDetails.value.rentalUnitSetupType}`) }, // eslint-disable-line max-len
        { label: t('strr.label.numberOfRooms'), info: unitDetails.value.numberOfRoomsForRent },
        { label: '', info: '', slot: 'border' },
        { label: t('strr.label.ownershipType'), info: t(`ownershipType.${unitDetails.value.ownershipType}`) },
        ...parcelId.value
      ]
    : [])
])
</script>
<template>
  <ConnectInfoTable
    data-testid="review-property-info"
    :items="propertyInfo"
  >
    <template #label-border>
      <div class="h-px w-full border-b border-gray-100" />
    </template>
    <template #info-border>
      <div class="-ml-4 h-px w-full border-b border-gray-100" />
    </template>
    <template #info-address>
      <ConnectFormAddressDisplayItem :address="unitAddress.address" />
      <FormUnitAddressHelp
        class="mt-2"
        :help-title="$t('help.address.review')"
      />
      <UAlert
        data-testid="alert-address-match-required"
        color="yellow"
        :close-button="null"
        variant="subtle"
        :ui="{
          wrapper: 'mt-4',
          inner: 'pt-0',
          padding: 'py-5 px-7'
        }"
      >
        <template #title>
          <ConnectI18nHelper translation-path="alert.platformMatchRequired" />
        </template>
      </UAlert>
    </template>
    <template #info-blExempt>
      <div class="flex gap-2">
        <UIcon name="i-mdi-check" class="mt-[2px] size-4 text-green-600" />
        <p>{{ $t('text.businessLicNotRequired') }}</p>
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
