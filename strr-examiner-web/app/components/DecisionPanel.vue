<script setup lang="ts">

const { t } = useI18n()
const { showDecisionPanel, decisionIntent } = useExaminerDecision()
const {
  isApplication,
  isAssignedToUser,
  decisionEmailContent,
  activeReg,
  activeHeader
} = storeToRefs(useExaminerStore())

// wip: conditions holder
const conditions = ref('')

// wip: email content to be sent to Completing Party
useExaminerStore().decisionEmailContent = t('decision.emailBodyIntro') + '\n\n' + conditions.value

const setDecisionIntent = (action: ApplicationActionsE | RegistrationActionsE) => {
  decisionIntent.value = action
}

const isApproveDecisionSelected = computed((): boolean => decisionIntent.value === ApplicationActionsE.APPROVE)

const decisionButtons = [
  {
    action: ApplicationActionsE.APPROVE,
    label: t('btn.approve'),
    color: 'green',
    activeClass: 'bg-green-100',
    icon: 'i-mdi-check',
    disabled: !isApplication.value && activeReg.value.status === RegistrationStatus.ACTIVE
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

// always visible buttons (approve and prov approve is one button)
const visibleActions = [
  ApplicationActionsE.APPROVE,
  ApplicationActionsE.PROVISIONAL_APPROVE,
  ApplicationActionsE.SEND_NOC,
  ApplicationActionsE.REJECT,
  ApplicationActionsE.SET_ASIDE,
  RegistrationActionsE.CANCEL
]

const moreActionItems = computed(() =>  
activeHeader.value.examinerActions
  .filter((action: ApplicationActionsE) => !visibleActions.includes(action))
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
        <div class="flex">
          <div class="w-1/2">
            <div class="flex justify-start gap-4">
              <UButton
                v-for="(button, i) in decisionButtons.filter(btn => !btn.hidden)"
                :key="'button-' + i"
                class="max-w-fit px-3 py-2"
                :class="decisionIntent === button.action && button.activeClass"
                :color="button.color || 'primary'"
                :disabled="button.disabled || !isAssignedToUser || false"
                :icon="button.icon || ''"
                :label="button.label"
                variant="outline"
                :data-testid="`decision-button-${button.action.toLocaleLowerCase()}`"
                @click="setDecisionIntent(button.action)"
              />
              <UDropdown
                :items="moreActionItems"
                size="xl"
              >
                <UButton
                  label="More Actions"
                  trailing-icon="i-mdi-chevron-down"
                  color="blue"
                  variant="outline"
                  :disabled="moreActionItems.length === 0"
                  data-testid="decision-button-more-actions"
                />
              </UDropdown>
            </div>

            <div
              v-if="isApproveDecisionSelected"
              data-testid="approval-conditions"
              class="mt-6"
            >
              [Approval Conditions Placeholder]
            </div>
          </div>
          <div class="flex-auto">
            <UTextarea
              v-model="decisionEmailContent"
              :placeholder="t('decision.emailBodyPlaceholder')"
              :aria-label="t('decision.emailBodyPlaceholder')"
              data-testid="decision-email"
              color="gray"
              class="text-bcGovColor-midGray focus:ring-0"
              auto-resize
              :disabled="isApproveDecisionSelected"
            />
          </div>
        </div>
      </div>
    </ConnectPageSection>
  </div>
</template>

<style scoped>

</style>
