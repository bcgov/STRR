<script setup lang="ts">
import steps from '../page-data/platform-application-steps'
import { FormPageI } from '@/interfaces/form/form-page-i'

const { t } = useTranslation()

const headerUpdateKey = ref(0)
const activeStepIndex: Ref<number> = ref(0)
const activeStep: Ref<FormPageI> = ref(steps[activeStepIndex.value])

const setActiveStep = (newStep: number) => {
  activeStep.value.step.complete = true
  activeStep.value = steps[newStep]
  activeStepIndex.value = newStep
}

const fee = ref<FeeI>()

const { getSmallPlatformApplicationFee } = useFees()

// TODO: by default load the Small Platform fee for now
fee.value = await getSmallPlatformApplicationFee()

definePageMeta({
  layout: 'wide'
})
</script>

<template>
  <div
    data-test-id="platform-application"
    class="w-full flex flex-col justify-between desktop:justify-center items-center relative"
  >
    <div class="w-full max-w-[1360px] px-4 flex">
      <div class="grow mr-6 mobile:mr-0">
        <BcrosTypographyH1 :text="t('platformApplication.header')" class-name="mobile:pb-[20px]" />

        <BcrosStepper
          :key="headerUpdateKey"
          :active-step="activeStepIndex"
          :steps="steps"
          @change-step="setActiveStep"
        />
        <div class="mt-8">
          <div v-if="activeStepIndex === 0" :key="activeStepIndex">
            [Step 1]
          </div>
          <div v-if="activeStepIndex === 1" :key="activeStepIndex">
            [Step 2]
          </div>
          <div v-if="activeStepIndex === 2" :key="activeStepIndex">
            [Step 3]
          </div>
          <div v-if="activeStepIndex === 3" :key="activeStepIndex">
            [Step 4]
          </div>
        </div>
      </div>
      <div class="shrink mobile:grow">
        <FeeWidget :fee="fee" />
      </div>
    </div>
  </div>
</template>

<style scoped></style>
