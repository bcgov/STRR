<script setup lang="ts">
import type { Form } from '#ui/types'
import { BlExemptionReason } from '~/enums/bl-exemption-reason'
const props = defineProps<{ isComplete: boolean }>()

const { t } = useNuxtApp().$i18n
const reqStore = usePropertyReqStore()

const blReqFormRef = ref<Form<any>>()
const blExemptionOptions = [
  {
    value: BlExemptionReason.OVER_30_DAYS,
    label: t('label.blExemptionReasonOver30')
  },
  {
    value: BlExemptionReason.OTHER,
    label: t('label.blExemptionReasonOther')
  }
]

watch(
  () => reqStore.blRequirements.isBusinessLicenceExempt,
  (val) => {
    if (val === false) {
      reqStore.blRequirements.blExemptReason = ''
      reqStore.blRequirements.blExemptType = undefined
      blReqFormRef.value?.validate(['blExemptReason'], { silent: true })
    }
  }
)

watch(() => reqStore.blRequirements.blExemptType,
  (val) => {
    if (val === BlExemptionReason.OVER_30_DAYS) {
      reqStore.blRequirements.blExemptReason = t('label.blExemptionReasonOver30')
      blReqFormRef.value?.validate(['blExemptReason'], { silent: true })
    }
    if (val === BlExemptionReason.OTHER) {
      reqStore.blRequirements.blExemptReason = ''
      blReqFormRef.value?.validate(['blExemptReason'], { silent: true })
    }
  })

onMounted(async () => {
  // validate form if step marked as complete
  if (props.isComplete && reqStore.blRequirements.isBusinessLicenceExempt === true) {
    await validateForm(blReqFormRef.value, props.isComplete)
  }
})
</script>
<template>
  <UForm
    ref="blReqFormRef"
    :state="reqStore.blRequirements"
    :schema="isComplete ? reqStore.blRequirementsSchema : undefined"
    class="space-y-10"
  >
    <fieldset class="flex flex-col gap-6">
      <legend class="sr-only">
        {{ t('strr.label.businessLicence') }}
      </legend>

      <UFormGroup name="isBusinessLicenceExempt">
        <UCheckbox
          v-model="reqStore.blRequirements.isBusinessLicenceExempt"
          :label="t('text.businessLicNotRequired')"
        />
      </UFormGroup>

      <ConnectFormSection
        v-if="reqStore.blRequirements.isBusinessLicenceExempt"
        :title="t('label.exemptionReason')"
        class="-mx-4 mb-4 md:-mx-10"
        :error="isComplete && hasFormErrors(blReqFormRef, ['blExemptReason'])"
      >
        <UFormGroup name="blExemptReason">
          <URadioGroup
            v-model="reqStore.blRequirements.blExemptType"
            :options="blExemptionOptions"
            data-testid="bl-exemption-options"
            :ui-radio="{
              wrapper: 'items-center',
              inner: 'space-y-6'
            }"
          >
            <template #label="{ option }">
              <div class="flex items-center">
                <p>{{ option.label }}</p>
                <UInput
                  v-if="option.value === BlExemptionReason.OTHER
                    && reqStore.blRequirements.blExemptType === BlExemptionReason.OTHER"
                  v-model="reqStore.blRequirements.blExemptReason"
                  maxlength="1000"
                  :aria-label="t('label.blExemptionReasonOtherPlaceholder')"
                  :placeholder="t('label.blExemptionReasonOtherPlaceholder')"
                  class="ml-4 sm:w-fit md:w-[520px]"
                />
              </div>
            </template>
          </URadioGroup>
        </UFormGroup>
      </ConnectFormSection>
    </fieldset>
  </UForm>
</template>
