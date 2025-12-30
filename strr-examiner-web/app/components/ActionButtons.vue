<script setup lang="ts">
import { refreshNuxtData } from 'nuxt/app'
import isEqual from 'lodash/isEqual'

const { t } = useNuxtApp().$i18n
const { decisionIntent, isMainActionDisabled, isDecisionEmailValid } = useExaminerDecision()
const {
  activeHeader, activeReg, isAssignedToUser,
  conditions,
  customConditions,
  minBookingDays,
  decisionEmailContent
} = storeToRefs(useExaminerStore())
const {
  assignRegistration,
  unassignRegistration,
  setAsideRegistration,
  updateRegistrationStatus,
  sendNoticeOfConsiderationForRegistration
} = useExaminerStore()
const { openConfirmActionModal, close: closeConfirmActionModal } = useStrrModals()

const hasSetAsideAction = computed((): boolean =>
  activeHeader.value?.examinerActions.includes(ApplicationActionsE.SET_ASIDE))

const isSetAside = computed((): boolean => activeHeader.value?.isSetAside)

const isRegApproved = computed((): boolean =>
  activeReg.value.status === RegistrationStatus.ACTIVE
)

const isMainActionButtonVisible = computed((): boolean => {
  if (!isAssignedToUser.value || !decisionIntent.value) {
    return false // if not assigned or decision is not selected - do not show the button
  }
  if (isSetAside.value) {
    return true // if set aside - always show the button
  }
  if (decisionIntent.value === ApplicationActionsE.APPROVE) {
    return hasDecisionChanges.value // if Approve selected - show based on tracked changes
  } else {
    return !!decisionIntent.value // is some decision selected - show the button
  }
})

// track changes between original conditions and new conditions
const hasDecisionChanges = computed(() =>
  !isEqual(
    activeReg.value.conditionsOfApproval,
    {
      customConditions: customConditions.value,
      minBookingDays: minBookingDays.value,
      predefinedConditions: conditions.value
    }
  )
)

const isApproveDecisionSelected = computed((): boolean => decisionIntent.value === ApplicationActionsE.APPROVE)

const approveRegistrationAction = () => {
  openConfirmActionModal(
    t('modal.approveRegistration.title'),
    t('modal.approveRegistration.message'),
    t('btn.yesApprove'),
    () => {
      closeConfirmActionModal()
      updateRegistrationStatus(
        activeReg.value.id,
        RegistrationStatus.ACTIVE,
        decisionEmailContent.value.content,
        {
          predefinedConditions: conditions.value,
          ...(customConditions.value && { customConditions: customConditions.value }),
          ...(minBookingDays.value !== null && { minBookingDays: minBookingDays.value })
        }
      )
      refreshNuxtData()
    },
    t('btn.cancel')
  )
}

const updateApprovalAction = () => {
  openConfirmActionModal(
    t('modal.updateApproval.title'),
    t('modal.updateApproval.message'),
    t('btn.updateApproval'),
    () => {
      closeConfirmActionModal()
      updateRegistrationStatus(
        activeReg.value.id,
        RegistrationStatus.ACTIVE,
        decisionEmailContent.value.content,
        {
          predefinedConditions: conditions.value,
          ...(customConditions.value && { customConditions: customConditions.value }),
          ...(minBookingDays.value !== null && { minBookingDays: minBookingDays.value })
        }
      )
      refreshNuxtData()
    },
    t('btn.cancel')
  )
}

const cancelRegistrationAction = async () => {
  // validate email form
  if (!await isDecisionEmailValid()) { return }

  openConfirmActionModal(
    t('modal.cancelRegistration.title'),
    t('modal.cancelRegistration.message'),
    t('btn.cancelRegistration'),
    () => {
      closeConfirmActionModal()
      updateRegistrationStatus(
        activeReg.value.id,
        RegistrationStatus.CANCELLED,
        decisionEmailContent.value.content
      )
      refreshNuxtData()
    },
    t('btn.back')
  )
}

const suspendRegistrationAction = () => {
  openConfirmActionModal(
    t('modal.suspendRegistration.title'),
    t('modal.suspendRegistration.message'),
    t('btn.yesSuspend'),
    () => {
      closeConfirmActionModal()
      updateRegistrationStatus(
        activeReg.value.id,
        RegistrationStatus.SUSPENDED
      )
      refreshNuxtData()
    },
    t('btn.cancel')
  )
}

const reinstateRegistration = () => {
  openConfirmActionModal(
    t('modal.reinstateRegistration.title'),
    t('modal.reinstateRegistration.message'),
    t('btn.yesReinstate'),
    () => {
      closeConfirmActionModal()
      updateRegistrationStatus(
        activeReg.value.id,
        RegistrationStatus.ACTIVE,
        decisionEmailContent.value.content,
        {
          predefinedConditions: conditions.value,
          ...(customConditions.value && { customConditions: customConditions.value }),
          ...(minBookingDays.value !== null && { minBookingDays: minBookingDays.value })
        }
      )
      refreshNuxtData()
    },
    t('btn.cancel')
  )
}

const sendNoticeAction = async () => {
  // validate email form
  if (!await isDecisionEmailValid()) { return }

  openConfirmActionModal(
    t('modal.sendNotice.title'),
    t('modal.sendNotice.message'),
    t('btn.yesSend'),
    () => {
      closeConfirmActionModal()
      sendNoticeOfConsiderationForRegistration(
        activeReg.value.id,
        decisionEmailContent.value.content
      )
      decisionEmailContent.value.content = ''
      refreshNuxtData()
    }
  )
}

const actionButtons: ConnectBtnControlItem[] = [
  {
    action: () => isRegApproved.value ? updateApprovalAction() : approveRegistrationAction(),
    label: ApplicationActionsE.APPROVE,
    color: 'green',
    icon: 'i-mdi-check'
  },
  {
    action: () => sendNoticeAction(),
    label: ApplicationActionsE.SEND_NOC,
    color: 'blue',
    icon: 'i-mdi-send'
  },
  {
    action: () => {}, // TODO: add reject action when on decisions for Applications
    label: ApplicationActionsE.REJECT,
    color: 'red',
    icon: 'i-mdi-close'
  },
  {
    action: () => cancelRegistrationAction(),
    label: RegistrationActionsE.CANCEL,
    color: 'red',
    icon: 'i-mdi-close'
  },
  {
    action: () => suspendRegistrationAction(),
    label: RegistrationActionsE.SUSPEND,
    color: 'primary',
    icon: 'i-mdi-pause'
  },
  {
    action: () => reinstateRegistration(),
    label: RegistrationActionsE.REINSTATE,
    color: 'primary',
    icon: 'i-mdi-rotate-left'
  }
]

const selectedAction = computed(() =>
  actionButtons.find(button => button.label === decisionIntent.value)
)

const assign = async () => {
  await assignRegistration(activeReg.value.id)
  refreshNuxtData()
}

const unassign = async () => {
  if (isAssignedToUser.value) {
    await unassignRegistration(activeReg.value.id)
    refreshNuxtData()
  } else {
    openConfirmActionModal(
      t('modal.unassign.title'),
      t('modal.unassign.message'),
      t('strr.label.unAssign'),
      async () => {
        closeConfirmActionModal()
        await unassignRegistration(activeReg.value.id)
        refreshNuxtData()
      }
    )
  }
}

const setAside = async () => {
  await setAsideRegistration(activeReg.value.id)
  refreshNuxtData()
}
</script>

<template>
  <div class="bg-white py-10" data-testid="button-control">
    <div class="app-inner-container">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div class="flex justify-center gap-4 md:justify-start">
            <UButton
              v-if="hasSetAsideAction"
              :label="t('btn.setAside')"
              variant="outline"
              icon="i-mdi-rotate-left"
              class="max-w-fit px-7 py-3"
              color="primary"
              :disabled="!isAssignedToUser"
              data-testid="action-button-set-aside"
              @click="setAside"
            />
          </div>
        </div>
        <div>
          <div class="flex justify-center gap-4 md:justify-end">
            <UButton
              v-if="activeHeader && activeHeader.assignee.username"
              :label="t('btn.unassign')"
              class="max-w-fit px-7 py-3"
              data-testid="action-button-unassign"
              variant="ghost"
              @click="unassign"
            />
            <UButton
              v-else
              :label="t('btn.assign')"
              class="max-w-fit px-7 py-3"
              data-testid="action-button-assign"
              variant="outline"
              @click="assign"
            />
            <!-- main button -->
            <UButton
              v-if="isMainActionButtonVisible"
              :label="isRegApproved && isApproveDecisionSelected
                ? t('btn.updateApproval') : t(`btn.${selectedAction?.label}`)"
              :color="selectedAction?.color || 'primary'"
              :icon="selectedAction?.icon"
              :disabled="isMainActionDisabled"
              variant="outline"
              class="max-w-fit px-7 py-3"
              data-testid="main-action-button"
              @click="selectedAction?.action"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
