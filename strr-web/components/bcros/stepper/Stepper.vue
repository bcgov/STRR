<template>
  <div
    class="
      rounded-[4px] w-full flex flex-row justify-between bg-white px-5 pt-5
      mobile:bg-transparent mobile:px-0 mobile:pt-0
    "
    data-test-id="stepper"
  >
    <div
      v-for="({ step }, index) in steps"
      :key="step.label"
      :class="`
        ${index == steps.length - 1 ? 'shrink grow-0': 'shrink-0 grow'}
        flex flex-row align-center
      `"
    >
      <div
        aria-roledescription="button"
        tabindex="0"
        :class="`
          ${index == activeStep.valueOf() ? 'border-b-[3px] border-blue-500' : ''}
          pb-5 flex flex-col cursor-pointer
          mobile:border-b-0
        `"
        @click="() => emit('changeStep', index)"
      >
        <div class="flex justify-center pt-[7px] ">
          <div
            :class="`
              ${index == activeStep.valueOf() ? 'bg-blue-500' : ''}
              grow-0 shrink outline outline-1 outline-blue-500 px-[15px] py-[15px]
              rounded-full flex justify-center items-center relative
              mobile:h-[32px] mobile:w-[32px] mobile:p-[2px]
            `"
          >
            <div v-if="step.complete">
              <img
                :src="step.isValid
                  ? '/icons/create-account/valid_step.svg'
                  : '/icons/create-account/invalid_step.svg'
                "
                :alt="step.isValid
                  ? 'Step successfully validated'
                  : 'Step did not pass validation'
                "
                class="absolute top-[-10px] right-[-10px]"
              >
            </div>
            <img
              :src="`${index == activeStep.valueOf() ? `${step.activeIconPath}`: step.inactiveIconPath}`"
              class="mobile:w-5 mobile:h-5"
              :alt="step.alt"
            >
          </div>
        </div>
        <p
          :class="`
            ${index == activeStep.valueOf() ? 'font-bold text-black' : 'text-blue-500'}
            mt-2 leading-5 text-[14px] max-w-[95px] text-center
            mobile:hidden
          `"
        >
          {{ t(step.label) }}
        </p>
      </div>
      <div
        v-if="index < steps.length - 1"
        class="self-center grow shrink-0 mb-[62px] mobile:mb-[12px]"
      >
        <div class="h-[1px] bg-bcGovColor-formFieldLines" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FormPageI } from '~/interfaces/form/form-page-i'

const {
  steps,
  activeStep
} = defineProps<{
  steps: FormPageI[],
  activeStep: number,
}>()

const emit = defineEmits<{
  changeStep: [stepIndex: number] // named tuple syntax
}>()

const { t } = useTranslation()

</script>
