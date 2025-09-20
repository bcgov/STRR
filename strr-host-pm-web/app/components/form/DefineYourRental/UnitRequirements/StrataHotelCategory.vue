<script setup lang="ts">
import type { Form } from '#ui/types'

const props = defineProps<{ isComplete: boolean }>()
const strataHotelCategoryFormRef = ref<Form<any>>()
const config = useRuntimeConfig().public

const { t } = useI18n()
const reqStore = usePropertyReqStore()
const { isNewRentalUnitSetupEnabled } = useHostFeatureFlags()

const strataHotelCategoryOptions = [
  {
    value: StrataHotelCategory.FULL_SERVICE,
    label: t(`strataHotelCategory.${StrataHotelCategory.FULL_SERVICE}`)
  },
  {
    value: StrataHotelCategory.MULTI_UNIT_NON_PR,
    label: t(`strataHotelCategory.${StrataHotelCategory.MULTI_UNIT_NON_PR}`)
  },
  {
    value: StrataHotelCategory.POST_DECEMBER_2023,
    label: t(`strataHotelCategory.${StrataHotelCategory.POST_DECEMBER_2023}`)
  }
]

onMounted(async () => {
  if (
    props.isComplete &&
    reqStore.prRequirements.isPropertyPrExempt &&
    reqStore.prRequirements.prExemptionReason === PrExemptionReason.STRATA_HOTEL
  ) {
    await validateForm(strataHotelCategoryFormRef.value, props.isComplete)
  }
})
</script>

<template>
  <UForm
    ref="strataHotelCategoryFormRef"
    :state="reqStore.strataHotelCategory"
    :schema="reqStore.strataHotelCategorySchema"
  >
    <ConnectFormSection
      :title="$t('label.strataHotelCategory')"
      class="-mx-4 mt-4 md:-mx-10"
      :error="props.isComplete && hasFormErrors(strataHotelCategoryFormRef, ['category', 'strataPlatformRegNum'])"
      data-testid="strata-hotel-category-section"
    >
      <UFormGroup name="category">
        <URadioGroup
          v-model="reqStore.strataHotelCategory.category"
          :options="strataHotelCategoryOptions"
          :aria-label="$t('label.strataHotelCategory')"
          :aria-invalid="error !== undefined"
          class="max-w-full pt-4"
          data-testid="strata-hotel-category-radio-group"
        >
          <template #legend>
            <UButton
              :to="config.housingProofOfPrUrl"
              target="_blank"
              :label="$t('link.selectStrataHotelCategory')"
              trailing-icon="i-mdi-open-in-new"
              variant="link"
              class="text-base underline"
              :padded="false"
              :ui="{ gap: { sm: 'gap-x-1.5' } }"
              data-testid="strata-hotel-category-info-link"
            />
          </template>
        </URadioGroup>
      </UFormGroup>
      <div
        v-if="isNewRentalUnitSetupEnabled"
        class="mt-8"
      >
        <ConnectFormFieldGroup
          id="strata-platform-reg-number"
          v-model="reqStore.strataHotelCategory.strataPlatformRegNum"
          class="max-w-full"
          name="strataPlatformRegNum"
          :help="$t('strr.hint.strataRegNumHint')"
          :placeholder="t('strr.label.strataRegNum')"
          :class="props.isComplete && hasFormErrors(strataHotelCategoryFormRef, ['strataPlatformRegNum'])"
        />

        <UButton
          target="_blank"
          :label="$t('link.strataPlatformRegNum')"
          leading-icon="i-mdi-info-outline"
          variant="link"
          class="mt-6 text-base"
          :padded="false"
          :ui="{ gap: { sm: 'gap-x-1.5' } }"
          data-testid="strata-platform-reg-num-help"
        />

        <UAlert
          color="yellow"
          class="mt-8 w-auto"
          icon="i-mdi-alert"
          :close-button="null"
          variant="subtle"
          :ui="{
            inner: 'pt-0',
            padding: 'p-6',
            icon: {
              base: 'w-5 h-5 self-start'
            }
          }"
          data-testid="alert-strata-hotel-unit"
        >
          <template #title>
            <ConnectI18nHelper translation-path="alert.strataHotelUnit" />
          </template>
        </UAlert>
      </div>
    </ConnectFormSection>
  </UForm>
</template>
