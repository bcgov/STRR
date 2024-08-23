<template>
  <div
    class="
      bg-white h-[120px] flex items-center w-full
      d:w-screen d:absolute d:left-[-55px] d:bottom-[0px]
      m:relative m:px-[8px]
      justify-center
    "
    data-test-id="stepper-footer"
  >
    <div class="w-full max-w-[1360px] flex">
      <BcrosButtonsPrimary
        :label="t('general.back')"
        :action="setPreviousStep"
        icon="i-mdi-chevron-left"
        :trailing="false"
        variant="outline"
        :class-name="`${isFirstStep ? 'hidden': ''} mr-[20px] mobile:mr-[8px]`"
      />
      <BcrosButtonsPrimary
        :label="isLastStep ? t('general.submitAndPay') : t('general.next')"
        :action="isLastStep ? submit : setNextStep"
        :icon="isLastStep ? '': 'i-mdi-chevron-right'"
        :trailing="true"
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
  setPreviousStep
} = defineProps<{
  isFirstStep: boolean,
  isLastStep: boolean,
  setNextStep:() => void,
  submit: () => void,
  setPreviousStep:() => void,
}>()

</script>
