<script setup lang="ts">
const { t } = useI18n()
defineProps<{ stepperLabel: string }>()
const emit = defineEmits<{ newStep: [stepIndex: number] }>()

const stepsModel = defineModel<Step[]>('steps', { default: () => [] })
const activeStepIndexModel = defineModel<number>('activeStepIndex', { default: 0 })
const activeStepModel = defineModel<Step>('activeStep', { default: () => {} })

const buttonRefs = ref<HTMLButtonElement[]>([])
const stepperOlRef = ref<HTMLOListElement | null>(null)
const stepImageRefs = ref<HTMLDivElement[] | null>(null)
const separatorPosition = ref<{ top: string, left: string, width: string }>({ top: '0px', left: '0px', width: '0px' })
const activeBorderPosition = ref<{ left: string, width: string }>({ left: '0px', width: '0px' })
const stepperVisible = useElementVisibility(stepperOlRef)

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

function createStepAriaLabel (index: number) {
  const step = stepsModel.value[index]
  const stepCount = t('label.stepCount', { current: index + 1, max: stepsModel.value.length })
  const label = step?.label ? t(step.label) : t(`${step?.i18nPrefix}.description.${index}`)
  const validity = step?.complete ? (step.isValid ? t('label.stepValid') : t('label.stepInvalid')) : ''

  return `${stepCount} ${label}, ${validity}`
}

function updateActiveBorderPosition () {
  if (stepperOlRef.value) {
    activeBorderPosition.value = {
      left: `${(stepperOlRef.value.offsetWidth / stepsModel.value.length) * activeStepIndexModel.value}px`,
      width: `${stepperOlRef.value.offsetWidth / stepsModel.value.length}px`
    }
  }
}

watch(activeStepIndexModel, (newIndex) => {
  buttonRefs.value[newIndex]?.focus()
  if (!stepperVisible.value) { // only scroll if stepper outside of viewport
    stepperOlRef.value?.scrollIntoView(true) // aligns top of stepper container to top of viewport
  }

  updateActiveBorderPosition()
})

useResizeObserver(stepperOlRef, () => {
  if (stepImageRefs.value && stepImageRefs.value[0] && buttonRefs.value && buttonRefs.value[0]) {
    separatorPosition.value = {
      top: `${stepImageRefs.value[0].offsetHeight / 2}px`,
      left: `${buttonRefs.value[0].offsetWidth / 2}px`,
      width: `${buttonRefs.value[0].offsetWidth * 3}px`
    }
  }

  updateActiveBorderPosition()
})

defineExpose({ setActiveStep, setNextStep, setPreviousStep, setStepValidity, buttonRefs })

onMounted(() => {
  if (stepsModel.value.length > 0) { // init first step based on activeStepIndexModel default value
    activeStepModel.value = stepsModel.value[activeStepIndexModel.value] as Step
  }
})
</script>
<template>
  <ol
    ref="stepperOlRef"
    :aria-label="stepperLabel"
    class="relative flex w-full flex-row justify-between rounded-[4px] bg-transparent sm:bg-white"
    data-testid="stepper"
  >
    <div
      class="absolute z-[1] w-full -translate-y-1/2 border-[0.5px] border-bcGovGray-500"
      :style="separatorPosition"
    />

    <div
      class="absolute bottom-0 hidden h-[3px] bg-blue-500
      transition-all duration-300 motion-reduce:transition-none sm:block"
      :style="activeBorderPosition"
    />

    <li
      v-for="(step, index) in stepsModel"
      :key="'step' + index"
      class="z-[2] w-full grow"
    >
      <button
        ref="buttonRefs"
        class="mx-auto flex w-full cursor-pointer flex-col items-center"
        :aria-label="createStepAriaLabel(index)"
        :aria-current="index === activeStepIndexModel ? 'step' : undefined"
        @click="setActiveStep(index)"
      >
        <div
          ref="stepImageRefs"
          class="flex justify-center bg-gray-100 p-4 pt-5 sm:bg-white"
        >
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
          class="hidden w-full px-4 pb-4 text-center text-sm leading-5 sm:block"
          :class="index === activeStepIndexModel ? 'font-bold text-black' : 'text-blue-500'"
        >
          {{ step.label ? $t(step.label) : $t(`${step.i18nPrefix}.description.${index}`) }}
        </p>
      </button>
      <!-- <div
        v-if="index < stepsModel.length - 1"
        class="mb-2 shrink-0 grow self-center sm:mb-10 md:mb-10"
      >
        <div class="h-px bg-gray-600" />
      </div> -->
    </li>
  </ol>
  <div v-if="stepsModel[activeStepIndexModel]?.i18nPrefix" class="space-y-5 py-5">
    <ConnectTypographyH2 :text="$t(`${stepsModel[activeStepIndexModel]?.i18nPrefix}.title.${activeStepIndexModel}`)" />
    <p>
      {{ $t(`${stepsModel[activeStepIndexModel]?.i18nPrefix}.info.${activeStepIndexModel}`) }}
    </p>
  </div>
</template>
