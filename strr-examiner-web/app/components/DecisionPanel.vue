<script setup lang="ts">
import { onMounted } from 'vue'

const { t } = useI18n()
const { showDecisionPanel, decisionIntent, preDefinedConditions } = useExaminerDecision()
const {
  isApplication,
  isAssignedToUser,
  decisionEmailContent,
  activeReg,
  activeHeader,
  decisionEmailFormRef,
  sendEmailSchema
} = storeToRefs(useExaminerStore())

const setDecisionIntent = (action: ApplicationActionsE | RegistrationActionsE) => {
  decisionIntent.value = action
}

const isApproveDecisionSelected = computed((): boolean => decisionIntent.value === ApplicationActionsE.APPROVE)
const isDecisionEmailDisabled = computed((): boolean => !!decisionIntent.value)

const conditions = ref<string[]>([])
const customCondition = ref<string>('') // custom condition to be added to lit of all conditions
const minBookingDays = ref<number | null>(null)

const decisionEmailPlaceholder = computed((): string =>
  decisionIntent.value === ApplicationActionsE.SEND_NOC || RegistrationActionsE.CANCEL
    ? t('decision.emailBodyPlaceholder')
    : t('decision.emailBodyIntro')
)

const enableApproveButton = computed(() =>
  activeHeader.value.examinerActions.includes(ApplicationActionsE.APPROVE) ||
  activeHeader.value.examinerActions.includes(ApplicationActionsE.PROVISIONAL_APPROVE) ||
  activeHeader.value.isSetAside ||
  activeReg.value.status === RegistrationActionsE.APPROVE
)

const decisionButtons = [
  {
    action: ApplicationActionsE.APPROVE,
    label: t('btn.approve'),
    color: 'green',
    activeClass: 'bg-green-100',
    icon: 'i-mdi-check',
    disabled: !enableApproveButton.value
  },
  {
    action: ApplicationActionsE.SEND_NOC,
    label: t('btn.sendNotice'),
    color: 'blue',
    activeClass: 'bg-blue-100',
    icon: 'i-mdi-send',
    disabled: !activeHeader.value.examinerActions.includes(ApplicationActionsE.SEND_NOC)
  },
  {
    action: ApplicationActionsE.REJECT,
    label: t('btn.decline'),
    color: 'red',
    activeClass: 'bg-red-100',
    icon: 'i-mdi-close',
    disabled: !activeHeader.value.examinerActions.includes(ApplicationActionsE.REJECT),
    hidden: !isApplication.value
  },
  {
    action: RegistrationActionsE.CANCEL,
    label: t('btn.cancel'),
    color: 'red',
    activeClass: 'bg-red-100',
    icon: 'i-mdi-close',
    disabled: !activeHeader.value.examinerActions.includes(RegistrationActionsE.CANCEL),
    hidden: isApplication.value
  }
]

// always visible buttons actions (approve and prov approve is one button)
const mainActions = [
  ApplicationActionsE.APPROVE,
  ApplicationActionsE.PROVISIONAL_APPROVE,
  ApplicationActionsE.SEND_NOC,
  ApplicationActionsE.REJECT,
  ApplicationActionsE.SET_ASIDE,
  RegistrationActionsE.CANCEL
]

// additional actions in the dropdown menu
const moreActionItems = computed(() =>
  activeHeader.value.examinerActions
    .filter((action: ApplicationActionsE) => !mainActions.includes(action))
    .map(
      (action: ApplicationActionsE) => {
        return [{
          label: t(`btn.${action}`),
          disabled: !isAssignedToUser.value,
          click: () => setDecisionIntent(action)
        }]
      }
    )
)

// update email content when conditions change
watch([conditions, minBookingDays],
  ([newConditions, newMinBookingDays]) => {
    const plainTextConditions = newConditions
    // get plain text for each condition from translations
      .map((condition) => {
        if (condition === 'minBookingDays') {
          if (!newMinBookingDays) { return }
          return `\u2022 ${t('approvalConditionsExpanded.minBookingDays', { minDays: newMinBookingDays })}`
        }
        return preDefinedConditions.includes(condition)
          ? `\u2022 ${t(`approvalConditionsExpanded.${condition}`)}`
          : `\u2022 ${condition}`
      })
      .join('\n')

    decisionEmailContent.value = 'Approval Conditions\n\n' + plainTextConditions
  }, { deep: true })

watch(customCondition, (val) => {
  if (val) {
    conditions.value.push(val)
    customCondition.value = ''
  }
}, { deep: true })

onMounted(() => {
  decisionEmailContent.value = ''
  decisionIntent.value = null
})

</script>

<template>
  <div
    v-if="showDecisionPanel"
    class="app-inner-container mb-10"
    data-testid="decision-panel"
  >
    <ConnectPageSection>
      <div class="px-10 py-6">
        <div class="mb-4 font-bold">
          {{ t('decision.title') }}
        </div>
        <div class="grid grid-cols-2 gap-x-5">
          <div class="">
            <div class="mb-6 flex justify-between gap-2">
              <UButton
                v-for="(button, i) in decisionButtons.filter(btn => !btn.hidden)"
                :key="'button-' + i"
                class="h-[44px] grow justify-center"
                :class="decisionIntent === button.action && button.activeClass"
                :color="button.color || 'primary'"
                :disabled="button.disabled || !isAssignedToUser"
                :icon="button.icon || ''"
                :label="button.label"
                variant="outline"
                :data-testid="`decision-button-${button.action.toLocaleLowerCase()}`"
                @click="setDecisionIntent(button.action)"
              />
              <UDropdown
                v-if="moreActionItems.length !== 0"
                :items="moreActionItems"
              >
                <UButton
                  :label="t('btn.moreActions')"
                  class="px-5"
                  trailing-icon="i-mdi-chevron-down"
                  variant="outline"
                  data-testid="decision-button-more-actions"
                />
              </UDropdown>
            </div>

            <ApprovalConditions
              v-if="isApproveDecisionSelected"
              v-model:conditions="conditions"
              v-model:custom-condition="customCondition"
              v-model:min-booking-days="minBookingDays"
            />
          </div>
          <div class="flex-auto">
            <UForm
              ref="decision"
              :schema="sendEmailSchema"
              :state="decisionEmailFormRef"
              :validate-on="['submit']"
            >
              <UFormGroup name="content">
                <UTextarea
                  v-model="decisionEmailContent"
                  :placeholder="decisionEmailPlaceholder"
                  :aria-label="decisionEmailPlaceholder"
                  data-testid="decision-email"
                  color="gray"
                  class="text-bcGovColor-midGray focus:ring-0"
                  auto-resize
                  :disabled="isDecisionEmailDisabled"
                  :ui="{ base: 'h-[290px]' }"
                />
              </UFormGroup>
            </UForm>
          </div>
        </div>
      </div>
    </ConnectPageSection>
  </div>
</template>

<style scoped>

</style>
