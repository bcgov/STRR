<script setup lang="ts">
import type { Form } from '#ui/types'
const props = defineProps<{ isComplete: boolean }>()

const { t } = useI18n()
const reqStore = usePropertyReqStore()

const prReqFormRef = ref<Form<any>>()
const prExemptionOptions = [
  {
    value: PrExemptionReason.STRATA_HOTEL,
    label: t(`label.exemptionReasonCode.${PrExemptionReason.STRATA_HOTEL}`)
  },
  {
    value: PrExemptionReason.FARM_LAND,
    label: t(`label.exemptionReasonCode.${PrExemptionReason.FARM_LAND}`)
  },
  {
    value: PrExemptionReason.FRACTIONAL_OWNERSHIP,
    label: t(`label.exemptionReasonCode.${PrExemptionReason.FRACTIONAL_OWNERSHIP}`)
  }
]

// reset fields/form errors when changing options
watch(
  () => reqStore.prRequirements,
  (newVal) => {
    // reset exemption reason and ref code on isPropertyExempt change
    if (newVal.isPropertyPrExempt === false) {
      reqStore.prRequirements.prExemptionReason = undefined
      prReqFormRef.value?.validate(['prExemptionReason'], { silent: true })
    }
  },
  { deep: true }
)

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete && reqStore.propertyReqs.isPrincipalResidenceRequired === true) {
    await validateForm(prReqFormRef.value, props.isComplete)
  }
})
</script>
<template>
  <UForm
    ref="prReqFormRef"
    :state="reqStore.prRequirements"
    :schema="reqStore.prRequirementsSchema"
    class="space-y-10"
  >
    <fieldset class="flex flex-col gap-6">
      <legend class="sr-only">
        {{ $t('strr.label.prRequirement') }}
      </legend>

      <UFormGroup name="isPropertyPrExempt">
        <UCheckbox
          v-model="reqStore.prRequirements.isPropertyPrExempt"
          :label="$t('text.thisPropIsExempt')"
        />
      </UFormGroup>

      <ConnectFormSection
        v-if="reqStore.prRequirements.isPropertyPrExempt"
        :title="$t('label.exemptionReason')"
        class="-mx-4 md:-mx-10"
        :error="isComplete && hasFormErrors(prReqFormRef, ['prExemptionReason'])"
      >
        <UFormGroup name="prExemptionReason">
          <URadioGroup
            v-model="reqStore.prRequirements.prExemptionReason"
            :options="prExemptionOptions"
          />
        </UFormGroup>
      </ConnectFormSection>
    </fieldset>
  </UForm>
</template>
