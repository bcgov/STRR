<script setup lang="ts">
import type { Form } from '#ui/types'

const props = defineProps<{ isComplete: boolean }>()
const strataHotelCategoryFormRef = ref<Form<any>>()
const config = useRuntimeConfig().public

const { t } = useI18n()
const reqStore = usePropertyReqStore()

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
      class="-mx-4 md:-mx-10"
      :error="isComplete && hasFormErrors(strataHotelCategoryFormRef, ['category'])"
      data-testid="strata-hotel-category-section"
    >
      <UFormGroup name="category">
        <URadioGroup
          v-model="reqStore.strataHotelCategory.category"
          :options="strataHotelCategoryOptions"
          aria-label="$t('label.strataHotelCategory')"
          aria-invalid="error !== undefined"
          :class="isComplete && reqStore.strataHotelCategory.category === undefined
            ? 'border-red-600 border-2 pt-4'
            : 'pt-4'
          "
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
    </ConnectFormSection>
  </UForm>
</template>
