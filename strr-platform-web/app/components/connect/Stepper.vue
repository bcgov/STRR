<script setup lang="ts">

const { steps, activeStep } = defineProps<{ steps: Step[], activeStep: number }>()

const emit = defineEmits<{ changeStep: [stepIndex: number] }>()

const { t } = useI18n()

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
        v-for="(step, index) in steps"
        :key="'step' + index"
        class="flex flex-row"
        :class="index == steps.length - 1 ? 'shrink grow-0': 'shrink-0 grow'"
      >
        <div
          aria-roledescription="button"
          tabindex="0"
          class="flex cursor-pointer flex-col border-b-0 border-blue-500 pb-5"
          :class="index === activeStep ? 'sm:border-b-[3px]' : ''"
          @click="() => emit('changeStep', index)"
        >
          <div class="flex justify-center pt-2 ">
            <div
              class="
                relative size-8 rounded-full p-[5px]
                outline outline-1 outline-blue-500
                sm:size-12 sm:p-3 md:size-16 md:p-4
              "
              :class="index === activeStep ? 'bg-blue-500' : ''"
            >
              <div v-if="step.complete">
                <img
                  :src="step.isValid
                    ? '/icons/valid_step.svg'
                    : '/icons/invalid_step.svg'
                  "
                  :alt="t(`validation.step.${step.isValid}`)"
                  class="absolute right-[-10px] top-[-10px]"
                >
              </div>
              <UIcon
                v-if="step.icon"
                class="size-5 sm:size-6 md:size-8"
                :class="index === activeStep ? 'text-white' : 'text-primary'"
                :name="step.icon"
              />
              <img
                v-else
                :src="`${index === activeStep ? `${step.activeIconPath}`: step.inactiveIconPath}`"
                class="size-5 sm:size-6 md:size-8"
                :alt="step.i18nPrefix ? t(`${step.i18nPrefix}.description.${index}`) : step.alt"
              >
            </div>
          </div>
          <p
            class="
              mt-2 hidden max-w-[95px] text-center
              text-[14px] leading-5 sm:block
            "
            :class="index === activeStep ? 'font-bold text-black' : 'text-blue-500'"
          >
            {{ step.label ? t(step.label) : t(`${step.i18nPrefix}.description.${index}`) }}
          </p>
        </div>
        <div
          v-if="index < steps.length - 1"
          class="mb-2 shrink-0 grow self-center sm:mb-10 md:mb-10"
        >
          <div class="h-px bg-gray-600" />
        </div>
      </div>
    </div>
  </div>
  <div v-if="steps[activeStep]?.i18nPrefix" class="space-y-5 py-5">
    <ConnectTypographyH2 :text="t(`${steps[activeStep]?.i18nPrefix}.title.${activeStep}`)" />
    <p>
      {{ t(`${steps[activeStep]?.i18nPrefix}.info.${activeStep}`) }}
    </p>
  </div>
</template>
