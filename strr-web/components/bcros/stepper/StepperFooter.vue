<template>
  <div
    class="
      bg-white h-[120px] flex items-center w-full
      d:absolute d:bottom-[0px]
      m:relative m:px-[8px]
      justify-center
    "
    data-test-id="stepper-footer"
  >
    <div class="w-full max-w-[1360px] flex px-4">
      <BcrosButtonsPrimary
        :label="t('general.back')"
        :action="setPreviousStep"
        icon="i-mdi-chevron-left"
        :trailing="false"
        variant="outline"
        :class-name="`${isFirstStep ? 'hidden': ''} mr-[20px] mobile:mr-[8px]`"
        data-test-id="stepper-footer-btn-left"
      />
      <BcrosButtonsPrimary
        :label="submitInProgress ? '' : (isLastStep ? t('general.submitAndPay') : t('general.next'))"
        :action="isLastStep ? submit : setNextStep"
        :icon="isLastStep ? '': 'i-mdi-chevron-right'"
        :trailing="true"
        :loading="submitInProgress"
        :class-name="submitInProgress
          ? 'desktop:min-w-[160px] mobile:min-w-[200px] min-h-[45px]'
          : ''
        "
        data-test-id="stepper-footer-btn-right"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useTranslation()

const {
  isFirstStep,
  isLastStep,
  setNextStep,
  submit,
  setPreviousStep,
  submitInProgress
} = defineProps<{
  isFirstStep: boolean,
  isLastStep: boolean,
  setNextStep:() => void,
  submit: () => void,
  setPreviousStep:() => void,
  submitInProgress: boolean
}>()

</script>
