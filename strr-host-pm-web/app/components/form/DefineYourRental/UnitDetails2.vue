<script setup lang="ts">
import type { Form } from '#ui/types'
const props = defineProps<{ isComplete: boolean }>()

const { t } = useI18n()
const reqStore = usePropertyReqStore()
const propStore = useHostPropertyStore()
const { getUnitDetailsSchema2 } = useHostPropertyStore()

const unitDetailsFormRef = ref<Form<any>>()

const isStrataHotelExemption = computed((): boolean =>
  reqStore.prRequirements.prExemptionReason === PrExemptionReason.STRATA_HOTEL)

const isPrRequired = computed((): boolean =>
  reqStore.propertyReqs.isPrincipalResidenceRequired)

const isPrExempt = computed((): boolean =>
  reqStore.prRequirements.isPropertyPrExempt)

const isHostTypeTenant = computed((): boolean =>
  propStore.unitDetails.hostType === PropertyHostType.LONG_TERM_TENANT)

const propertyTypes = [
  { name: t(`propertyType.${PropertyType.SINGLE_FAMILY_HOME}`), value: PropertyType.SINGLE_FAMILY_HOME },
  { name: t(`propertyType.${PropertyType.SECONDARY_SUITE}`), value: PropertyType.SECONDARY_SUITE },
  { name: t(`propertyType.${PropertyType.ACCESSORY_DWELLING}`), value: PropertyType.ACCESSORY_DWELLING },
  { name: t(`propertyType.${PropertyType.MULTI_UNIT_HOUSING}`), value: PropertyType.MULTI_UNIT_HOUSING },
  { name: t(`propertyType.${PropertyType.BED_AND_BREAKFAST}`), value: PropertyType.BED_AND_BREAKFAST },
  { name: t(`propertyType.${PropertyType.FLOAT_HOME}`), value: PropertyType.FLOAT_HOME }
]

const strataHotelPropertyType = [
  { name: t(`propertyType.${PropertyType.STRATA_HOTEL}`), value: PropertyType.STRATA_HOTEL }
]

const propertyHostTypeOptions = [
  { value: PropertyHostType.OWNER, label: t(`propertyHostType.${PropertyHostType.OWNER}`) },
  { value: PropertyHostType.FRIEND_RELATIVE, label: t(`propertyHostType.${PropertyHostType.FRIEND_RELATIVE}`) },
  { value: PropertyHostType.LONG_TERM_TENANT, label: t(`propertyHostType.${PropertyHostType.LONG_TERM_TENANT}`) }
]

const rentalUnitSetupOptions = computed(() => [
  {
    label: t(`rentalUnitSetupOption.${RentalUnitSetupOption.OPTION_1}.label`),
    value: RentalUnitSetupOption.OPTION_1,
    disabled: (isPrRequired.value && !isPrExempt.value) || isHostTypeTenant.value
  },
  {
    label: t(`rentalUnitSetupOption.${RentalUnitSetupOption.OPTION_2}.label`),
    value: RentalUnitSetupOption.OPTION_2,
    disabled: isHostTypeTenant.value
  },
  {
    label: t(`rentalUnitSetupOption.${RentalUnitSetupOption.OPTION_3}.label`),
    value: RentalUnitSetupOption.OPTION_3
  }
])

// revalidate parcelIdentifier when user changes ownership types
watch(
  () => propStore.unitDetails.ownershipType,
  (newVal) => {
    if (newVal &&
        [OwnershipType.OWN, OwnershipType.CO_OWN].includes(newVal) &&
        propStore.unitDetails.parcelIdentifier !== ''
    ) {
      unitDetailsFormRef.value?.validate('parcelIdentifier', { silent: true })
    }
    if (newVal &&
        [OwnershipType.RENT, OwnershipType.OTHER].includes(newVal) &&
        propStore.unitDetails.parcelIdentifier === ''
    ) {
      unitDetailsFormRef.value?.validate('parcelIdentifier', { silent: true })
    }
  }
)

// watch and set Property Host Type as strata if PR Exemption reason is Strata Hotel
watch(() => reqStore.prRequirements.prExemptionReason, async (val) => {
  if (val === PrExemptionReason.STRATA_HOTEL) {
    propStore.unitDetails.propertyType = PropertyType.STRATA_HOTEL
    await validateForm(unitDetailsFormRef.value, props.isComplete) // validate the form to clear the unit type errors
  }
}, { immediate: true })

// watch and clear unit setup radio if one of the disabled options selected
watch(() => propStore.unitDetails.hostType, (val) => {
  const isLongTermTenant = val === PropertyHostType.LONG_TERM_TENANT
  const isDisabledOptionSelected = [RentalUnitSetupOption.OPTION_1, RentalUnitSetupOption.OPTION_2]
    .includes(propStore.unitDetails.rentalUnitSetupOption as RentalUnitSetupOption)

  if (isLongTermTenant && isDisabledOptionSelected) {
    propStore.unitDetails.rentalUnitSetupOption = null
  }
}, { immediate: true })

// watch and clear unit setup radio option 1 if PR is not exempt
watch(() => reqStore.prRequirements.isPropertyPrExempt, (val) => {
  const isNotExempt = !val
  const isDisabledOptionSelected = [RentalUnitSetupOption.OPTION_1]
    .includes(propStore.unitDetails.rentalUnitSetupOption as RentalUnitSetupOption)

  if (isNotExempt && isDisabledOptionSelected) {
    propStore.unitDetails.rentalUnitSetupOption = null
  }
}, { immediate: true })

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete) {
    await validateForm(unitDetailsFormRef.value, props.isComplete)
  }
})
</script>
<template>
  <UForm
    v-if="reqStore.showUnitDetailsForm"
    ref="unitDetailsFormRef"
    data-testid="form-unit-details"
    :schema="getUnitDetailsSchema2()"
    :state="propStore.unitDetails"
    class="space-y-10"
  >
    <ConnectPageSection>
      <div class="space-y-10 py-10">
        <!-- property type section -->
        <ConnectFormSection
          :title="$t('strr.label.strRentalType')"
          :error="isComplete && hasFormErrors(unitDetailsFormRef, ['propertyType'])"
        >
          <UFormGroup id="property-type" v-slot="{ error }" name="propertyType">
            <USelectMenu
              v-model="propStore.unitDetails.propertyType"
              value-attribute="value"
              size="lg"
              :color="propStore.unitDetails.propertyType ? 'primary' : 'gray'"
              :placeholder="$t('strr.label.selectPropertyType')"
              :options="isStrataHotelExemption ? strataHotelPropertyType : propertyTypes"
              option-attribute="name"
              :disabled="isStrataHotelExemption"
              :aria-label="$t('strr.label.selectPropertyType')"
              :aria-required="true"
              :aria-invalid="error !== undefined"
              :ui="{ base: 'disabled:opacity-50' }"
              :ui-menu="{
                label: propStore.unitDetails.propertyType ? 'text-gray-900' : !!error? 'text-red-600': 'text-gray-700'
              }"
              data-testid="property-type-select"
            />
          </UFormGroup>

          <UAlert
            v-if="propStore.isUnitNumberRequired"
            class="mt-6"
            color="yellow"
            icon="i-mdi-alert"
            :close-button="null"
            variant="subtle"
            :ui="{
              inner: 'pt-0',
              padding: 'p-6',
              icon: {
                base: 'flex-shrink-0 w-5 h-5 self-start'
              }
            }"
          >
            <template #title>
              <ConnectI18nHelper
                class="text-bcGovGray-700"
                :translation-path="
                  [PropertyType.SECONDARY_SUITE, PropertyType.ACCESSORY_DWELLING]
                    .includes(propStore.unitDetails.propertyType!) ?
                      'alert.propertyTypeReqUnitNumber.maybe' :
                      'alert.propertyTypeReqUnitNumber.always'
                "
                :propertytype="$t(`propertyType.${propStore.unitDetails.propertyType}`)"
              />
            </template>
          </UAlert>
        </ConnectFormSection>

        <!-- Property Host Type -->
        <ConnectFormSection
          :title="$t('strr.label.hostType')"
          :error="isComplete && hasFormErrors(unitDetailsFormRef, ['hostType'])"
        >
          <UFormGroup name="hostType">
            <URadioGroup
              id="host-type-radio-group"
              v-model="propStore.unitDetails.hostType"
              :legend="$t('text.hostTypeLegend')"
              :options="propertyHostTypeOptions"
              :ui="{ legend: 'sr-only' }"
              :ui-radio="{ inner: 'space-y-2' }"
              data-testid="property-host-type"
            />
          </UFormGroup>
        </ConnectFormSection>

        <!-- rental unit setup section -->
        <ConnectFormSection
          :title="$t('strr.label.rentalUnitSetup')"
          :error="isComplete && hasFormErrors(unitDetailsFormRef, ['rentalUnitSetupOption'])"
        >
          <UFormGroup
            id="rental-unit-setup"
            name="rentalUnitSetupOption"
            class="w-full"
          >
            <ConnectI18nHelper
              translation-path="strr.label.rentalUnitSetupNote"
              class="mb-8 block border-y py-4 text-sm italic"
            />
            <URadioGroup
              id="rental-unit-setup-radio-group"
              v-model="propStore.unitDetails.rentalUnitSetupOption"
              class="max-w-full"
              :options="rentalUnitSetupOptions"
              :legend="$t('text.rentalUnitSetupLegend')"
              :ui="{ legend: 'sr-only' }"
              :ui-radio="{ inner: 'space-y-2', label: 'font-bold' }"
              data-testid="unit-setup-option"
            >
              <template #label="{ option }">
                <span :class="{ 'opacity-50': option.disabled }">
                  {{ option.label }}
                </span>
              </template>
              <template #help="{ option }">
                <span :class="{ 'opacity-50': option.disabled }">
                  <FormDefineYourRentalUnitSetupOptions :option="option" />
                </span>
              </template>
            </URadioGroup>
          </UFormGroup>
        </ConnectFormSection>
      </div>
    </ConnectPageSection>
  </UForm>
</template>
