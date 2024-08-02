<template>
  <div
    class="
      bg-white h-[120px] flex items-center w-full
      d:w-screen d:absolute d:left-[-55px] d:bottom-[0px]
      m:relative m:px-[8px]
      justify-center
    "
    data-cy="stepper-footer"
  >
    <div class="w-full max-w-[1360px] flex">
      <BcrosButtonsPrimary
        :text="t('general.back')"
        :action="setPreviousStep"
        icon="i-mdi-chevron-left"
        :trailing="false"
        variant="outline"
        alt="previous"
        :class-name="`${isFirstStep ? 'hidden': ''} mr-[20px] mobile:mr-[8px]`"
      />
      <BcrosButtonsPrimary
        :text="isLastStep ? t('general.submit-and-pay') : t('general.next')"
        :action="isLastStep ? submit : setNextStep"
        :icon="isLastStep ? '': 'i-mdi-chevron-right'"
        :alt="isLastStep ? '': 'next icon'"
        :trailing="true"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const t = useNuxtApp().$i18n.t

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
