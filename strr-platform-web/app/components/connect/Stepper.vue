<script setup lang="ts">
const emit = defineEmits<{ newStep: [stepIndex: number] }>()

const stepsModel = defineModel<Step[]>('steps', { default: () => [] })
const activeStepIndexModel = defineModel<number>('activeStepIndex', { default: 0 })
const activeStepModel = defineModel<Step>('activeStep', { default: () => {} })

async function setActiveStep (newStep: number) {
  activeStepModel.value.complete = true // set currently active step to complete

  if (activeStepModel.value.validationFn) { // run step validation if exists
    const isValid = await activeStepModel.value.validationFn()
    setStepValidity(activeStepIndexModel.value, !!isValid)
  }

  activeStepIndexModel.value = newStep // update active step index
  activeStepModel.value = stepsModel.value[newStep] as Step // update active step model

  // mark and validate all previous steps
  for (let i = 0; i < newStep; i++) {
    const previousStep = stepsModel.value[i]

    if (previousStep) {
      previousStep.complete = true

      if (previousStep.validationFn) {
        const isValid = await previousStep.validationFn()
        setStepValidity(i, !!isValid)
      }
    }
  }

  emit('newStep', newStep)
}

function setNextStep () {
  const totalSteps = stepsModel.value.length
  const currentStep = activeStepIndexModel.value

  // check if not on last step
  if (currentStep < totalSteps - 1) {
    setActiveStep(currentStep + 1)
  }
}

function setPreviousStep () {
  const currentStep = activeStepIndexModel.value

  // check if not on first step
  if (currentStep > 0) {
    setActiveStep(currentStep - 1)
  }
}

function setStepValidity (index: number, valid: boolean) {
  // @ts-ignore
  stepsModel.value[index].isValid = valid
}

defineExpose({ setActiveStep, setNextStep, setPreviousStep, setStepValidity })

onMounted(() => {
  if (stepsModel.value.length > 0) { // init first step based on activeStepIndexModel default value
    activeStepModel.value = stepsModel.value[activeStepIndexModel.value] as Step
  }
})
</script>
<template>
  <div>
    <div
      class="
        flex w-full flex-row justify-between
        rounded-[4px] bg-transparent px-0 pt-0
        sm:bg-white sm:px-5 sm:pt-5
      "
      data-testid="stepper"
    >
      <div
        v-for="(step, index) in stepsModel"
        :key="'step' + index"
        class="flex flex-row"
        :class="index == stepsModel.length - 1 ? 'shrink grow-0': 'shrink-0 grow'"
      >
        <button
          class="flex cursor-pointer flex-col items-center border-b-0 border-blue-500 pb-5"
          :class="index === activeStepIndexModel ? 'sm:border-b-[3px]' : ''"
          @click="setActiveStep(index)"
        >
          <div class="flex justify-center pt-2 ">
            <div
              class="
                relative size-8 rounded-full p-[5px]
                outline outline-1 outline-blue-500
                sm:size-12 sm:p-3 md:size-16 md:p-4
              "
              :class="index === activeStepIndexModel ? 'bg-blue-500' : ''"
            >
              <div v-if="step.complete">
                <img
                  :src="step.isValid
                    ? '/icons/valid_step.svg'
                    : '/icons/invalid_step.svg'
                  "
                  :alt="$t(`validation.step.${step.isValid}`)"
                  class="absolute right-[-10px] top-[-10px]"
                >
              </div>
              <UIcon
                v-if="step.icon"
                class="size-5 sm:size-6 md:size-8"
                :class="index === activeStepIndexModel ? 'text-white' : 'text-primary'"
                :name="step.icon"
              />
              <img
                v-else
                :src="`${index === activeStepIndexModel ? `${step.activeIconPath}`: step.inactiveIconPath}`"
                class="size-5 sm:size-6 md:size-8"
                :alt="step.i18nPrefix ? $t(`${step.i18nPrefix}.description.${index}`) : step.alt"
              >
            </div>
          </div>
          <p
            class="
              mt-2 hidden max-w-[95px] text-center
              text-[14px] leading-5 sm:block
            "
            :class="index === activeStepIndexModel ? 'font-bold text-black' : 'text-blue-500'"
          >
            {{ step.label ? $t(step.label) : $t(`${step.i18nPrefix}.description.${index}`) }}
          </p>
        </button>
        <div
          v-if="index < stepsModel.length - 1"
          class="mb-2 shrink-0 grow self-center sm:mb-10 md:mb-10"
        >
          <div class="h-px bg-gray-600" />
        </div>
      </div>
    </div>
  </div>
  <div v-if="stepsModel[activeStepIndexModel]?.i18nPrefix" class="space-y-5 py-5">
    <ConnectTypographyH2 :text="$t(`${stepsModel[activeStepIndexModel]?.i18nPrefix}.title.${activeStepIndexModel}`)" />
    <p>
      {{ $t(`${stepsModel[activeStepIndexModel]?.i18nPrefix}.info.${activeStepIndexModel}`) }}
    </p>
  </div>
</template>
