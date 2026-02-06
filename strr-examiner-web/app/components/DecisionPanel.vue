<script setup lang="ts">
import { onMounted } from 'vue'

const { t } = useNuxtApp().$i18n
const { showDecisionPanel, decisionIntent, preDefinedConditions, resetDecision } = useExaminerDecision()
const {
  isApplication,
  isAssignedToUser,
  activeReg,
  activeHeader,
  decisionEmailFormRef,
  sendNocSchema,
  conditions,
  customConditions,
  minBookingDays,
  decisionEmailContent
} = storeToRefs(useExaminerStore())

const setDecisionIntent = (action: ApplicationActionsE | RegistrationActionsE) => {
  // do not reset anything for same actions
  if (decisionIntent.value === action) { return }
  decisionIntent.value = action
  // reset
  localConditions.value = []
  decisionEmailContent.value.content = ''
  conditions.value = []
  customConditions.value = null
  minBookingDays.value = null
  decisionEmailFormRef?.value?.clear()
}

const isApproveDecisionSelected = computed((): boolean => decisionIntent.value === ApplicationActionsE.APPROVE)
const isDecisionEmailDisabled = computed((): boolean =>
  !!decisionIntent.value && decisionIntent.value === ApplicationActionsE.APPROVE)

const localConditions = ref<string[]>([])
const customCondition = ref<string>('') // custom condition to be added to lit of all conditions

const decisionEmailPlaceholder = computed((): string =>
  [ApplicationActionsE.SEND_NOC,
    ApplicationActionsE.REJECT,
    RegistrationActionsE.CANCEL,
    RegistrationActionsE.SUSPEND
  ].includes(decisionIntent.value)
    ? t('decision.emailBodyPlaceholder')
    : t('decision.noConditionsPlaceholder')
)

const enableApproveButton = computed(() =>
  activeHeader.value.examinerActions.includes(ApplicationActionsE.APPROVE) ||
  activeHeader.value.examinerActions.includes(ApplicationActionsE.PROVISIONAL_APPROVE) ||
  activeHeader.value.isSetAside ||
  activeReg.value.status === RegistrationStatus.ACTIVE
)

const decisionButtons = [
  {
    action: ApplicationActionsE.APPROVE,
    label: t('btn.approve'),
    color: 'green',
    activeStyle: 'bg-str-bgGreen text-str-textGray hover:bg-str-bgGreen',
    icon: 'i-mdi-check',
    disabled: !enableApproveButton.value
  },
  {
    action: ApplicationActionsE.SEND_NOC,
    label: t('btn.sendNotice'),
    color: 'blue',
    activeStyle: 'bg-str-bgBlue text-str-textGray hover:bg-str-bgBlue',
    icon: 'i-mdi-send',
    disabled: !activeHeader.value.examinerActions.includes(ApplicationActionsE.SEND_NOC)
  },
  {
    action: ApplicationActionsE.REJECT,
    label: t('btn.decline'),
    color: 'red',
    activeStyle: 'bg-str-bgRed text-str-textGray hover:bg-str-bgRed',
    icon: 'i-mdi-close',
    disabled: !activeHeader.value.examinerActions.includes(ApplicationActionsE.REJECT),
    hidden: !isApplication.value
  },
  {
    action: RegistrationActionsE.CANCEL,
    label: t('btn.cancel'),
    color: 'red',
    activeStyle: 'bg-str-bgRed text-str-textGray hover:bg-str-bgRed',
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

const loadExistingConditions = () => {
  localConditions.value = []

  const { predefinedConditions, customConditions, minBookingDays: minDays } = activeReg.value.conditionsOfApproval || {}

  // load pre-defined conditions
  if (predefinedConditions?.length) {
    localConditions.value.push(...predefinedConditions)
  }

  // load custom conditions conditions
  if (customConditions?.length) {
    localConditions.value.push(...customConditions)
  }

  if (minDays) {
    minBookingDays.value = minDays
  }
}

// update email content when conditions change
watch([localConditions, minBookingDays],
  ([newConditions, newMinBookingDays]) => {
    // reset conditions
    conditions.value = []
    customConditions.value = null

    // condition items for email body
    const items: string[] = []

    for (const condition of newConditions) {
      if (condition === 'minBookingDays') {
        if (!newMinBookingDays) { continue }
        const minBookingDaysText =
          t('approvalConditionsExpanded.minBookingDays', { minDays: newMinBookingDays })
        conditions.value.push(condition)
        items.push(`\u2022 ${minBookingDaysText}`)
        continue
      }

      if (preDefinedConditions.includes(condition)) {
        // for pre-defined conditions - add expanded expanded text to email
        const conditionText = t(`approvalConditionsExpanded.${condition}`)
        conditions.value.push(condition)
        items.push(`\u2022 ${conditionText}`)
      } else {
        // for custom conditions - add conditions as is to email
        if (!customConditions.value) {
          customConditions.value = []
        }
        customConditions.value.push(condition)
        items.push(`\u2022 ${condition}`)
      }
    }

    decisionEmailContent.value.content = items.join('\n')
  }, { deep: true })

watch(customCondition, (val) => {
  if (val) {
    localConditions.value.push(val)
    customCondition.value = ''
  }
}, { deep: true })

onMounted(() => {
  resetDecision()
  if (activeReg.value.status === RegistrationStatus.ACTIVE) {
    setDecisionIntent(ApplicationActionsE.APPROVE)
    loadExistingConditions() // requirement: load conditions only for active registrations
  }
})

</script>

<template>
  <div
    v-if="showDecisionPanel"
    class="app-inner-container mb-4"
    data-testid="decision-panel"
  >
    <!-- Header -->
    <div class="flex items-center justify-between rounded-t-lg bg-[#E2E8EE] px-6 py-4">
      <div class="flex items-center gap-2">
        <UIcon
          name="i-mdi-format-list-checks"
          class="size-6 text-str-blue"
        />
        <h3 class="text-lg text-str-textGray">
          {{ t('label.actions') }}
        </h3>
      </div>
    </div>
    <div class="bg-white p-6">
      <div class="grid grid-cols-2 gap-x-5">
        <div>
          <div class="font-bold">
            {{ t('decision.title') }}
          </div>
          <UTooltip
            text="Assign yourself to make changes"
            :prevent="isAssignedToUser"
            :popper="{
              arrow: true,
              placement: 'top',
              offsetDistance: 16 }"
            class="mb-6 mt-4 flex flex-wrap justify-between gap-2"
            :ui="{
              base: 'p-5'
            }"
          >
            <UButton
              v-for="(button, i) in decisionButtons.filter(btn => !btn.hidden)"
              :key="'button-' + i"
              class="h-[44px] grow justify-center"
              :class="decisionIntent === button.action && button.activeStyle"
              :color="button.color || 'primary'"
              :disabled="button.disabled || !isAssignedToUser"
              :icon="button.icon || ''"
              :label="button.label"
              variant="outline"
              :data-testid="`decision-button-${button.action.toLocaleLowerCase()}`"
              size="md"
              @click="setDecisionIntent(button.action)"
            />
            <UDropdown
              v-if="moreActionItems.length !== 0"
              :items="moreActionItems"
            >
              <UButton
                :label="t('btn.moreActions')"
                class="h-[44px] px-5"
                color="blue"
                trailing-icon="i-mdi-chevron-down"
                variant="outline"
                data-testid="decision-button-more-actions"
                :disabled="!isAssignedToUser"
              />
            </UDropdown>
          </UTooltip>

          <ApprovalConditions
            v-if="isApproveDecisionSelected && isAssignedToUser"
            v-model:conditions="localConditions"
            v-model:custom-condition="customCondition"
            v-model:min-booking-days="minBookingDays"
          />
        </div>
        <div>
          <div class="font-bold">
            {{ t('decision.emailTitle') }}
          </div>
          <UForm
            ref="decisionEmailFormRef"
            :schema="sendNocSchema"
            :state="decisionEmailContent"
            :validate-on="['submit']"
            class="mt-4"
          >
            <UFormGroup
              name="content"
              :ui="{
                wrapper: 'mb-4',
                error: 'text-xs/5 mt-1 absolute'
              }"
            >
              <UTextarea
                v-model="decisionEmailContent.content"
                :placeholder="decisionEmailPlaceholder"
                :aria-label="decisionEmailPlaceholder"
                data-testid="decision-email"
                color="gray"
                auto-resize
                :disabled="isDecisionEmailDisabled"
                :ui="{
                  base: 'h-[290px] !bg-str-bgGray focus:ring-0',
                  padding: {
                    sm: 'p-4'
                  }
                }"
                @update:model-value="decisionEmailFormRef.clear()"
              />
            </UFormGroup>
          </UForm>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
