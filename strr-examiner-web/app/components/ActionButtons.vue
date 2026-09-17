<script setup lang="ts">
import { refreshNuxtData } from 'nuxt/app'
import isEqual from 'lodash/isEqual'

const { t } = useNuxtApp().$i18n
const { decisionIntent, isMainActionDisabled, isDecisionEmailValid } = useExaminerDecision()
const {
  activeHeader, activeReg, isApplication, isAssignedToUser,
  conditions,
  customConditions,
  minBookingDays,
  decisionEmailContent
} = storeToRefs(useExaminerStore())
const {
  assignApplication,
  unassignApplication,
  approveApplication,
  provisionallyApproveApplication,
  rejectApplication,
  withdrawApplication,
  sendNoticeOfConsideration,
  assignRegistration,
  unassignRegistration,
  setAsideRegistration,
  updateRegistrationStatus,
  sendNoticeOfConsiderationForRegistration
} = useExaminerStore()
const { openConfirmActionModal, close: closeConfirmActionModal } = useStrrModals()
const { withNoteCheck } = useExaminerNotes()

const hasSetAsideAction = computed((): boolean =>
  activeHeader.value?.examinerActions?.includes(ApplicationActionsE.SET_ASIDE) ?? false)

const isSetAside = computed((): boolean => activeHeader.value?.isSetAside ?? false)

const isRegApproved = computed((): boolean =>
  activeReg.value?.status === RegistrationStatus.ACTIVE
)
const applicationNumber = computed(() => activeHeader.value?.applicationNumber)
const isProvisionalApplication = computed(() => [
  ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING,
  ApplicationStatus.PROVISIONAL_REVIEW_NOC_EXPIRED
].includes(activeHeader.value?.status))

const refreshDecisionData = async () => {
  await refreshNuxtData(isApplication?.value ? 'application-details-view' : 'registration-details-view')
}

const withApplicationNumber = (action: (number: string) => Promise<void>) => {
  const number = applicationNumber.value
  return number ? action(number) : Promise.resolve()
}

const assignCurrentRecord = async () => {
  if (isApplication?.value) {
    await withApplicationNumber(number => assignApplication(number))
  } else {
    await assignRegistration(activeReg.value!.id)
  }
}

const unassignCurrentRecord = async () => {
  if (isApplication?.value) {
    await withApplicationNumber(number => unassignApplication(number))
  } else {
    await unassignRegistration(activeReg.value!.id)
  }
}

const isMainActionButtonVisible = computed((): boolean => {
  if (!isAssignedToUser.value || !decisionIntent.value) {
    return false // if not assigned or decision is not selected - do not show the button
  }
  if (isSetAside.value) {
    return true // if set aside - always show the button
  }
  if (decisionIntent.value === ApplicationActionsE.APPROVE) {
    return isApplication?.value || hasDecisionChanges.value // applications have no approval conditions to track
  } else {
    return !!decisionIntent.value // is some decision selected - show the button
  }
})

// track changes between original conditions and new conditions
const hasDecisionChanges = computed(() =>
  !isEqual(
    activeReg.value?.conditionsOfApproval,
    {
      customConditions: customConditions.value,
      minBookingDays: minBookingDays.value,
      predefinedConditions: conditions.value
    }
  )
)

const isApproveDecisionSelected = computed((): boolean => decisionIntent.value === ApplicationActionsE.APPROVE)

const approvalConditions = computed<ConditionsOfApproval>(() => ({
  predefinedConditions: conditions.value.filter(condition => condition !== 'minBookingDays'),
  ...(customConditions.value && { customConditions: customConditions.value }),
  ...(minBookingDays.value !== null && { minBookingDays: minBookingDays.value })
}))

// Shared ACTIVE status update for approve actions
const applyActiveApprovalStatus = async () => {
  if (isApplication?.value) {
    if (!applicationNumber.value) { return }
    const approve = activeHeader.value?.examinerActions?.includes(ApplicationActionsE.PROVISIONAL_APPROVE)
      ? provisionallyApproveApplication
      : approveApplication
    await approve(applicationNumber.value, approvalConditions.value)
    await refreshDecisionData()
    return
  }
  await updateRegistrationStatus(
    activeReg.value.id,
    RegistrationStatus.ACTIVE,
    decisionEmailContent.value.content,
    approvalConditions.value
  )
  await refreshDecisionData()
}

const cancelRegistrationAction = async () => {
  // validate email form
  if (!await isDecisionEmailValid()) { return }

  if (isApplication?.value) {
    if (!applicationNumber.value) { return }
    await rejectApplication(
      applicationNumber.value,
      isProvisionalApplication.value,
      decisionEmailContent.value.content
    )
  } else {
    await updateRegistrationStatus(
      activeReg.value!.id,
      RegistrationStatus.CANCELLED,
      decisionEmailContent.value.content
    )
  }
  await refreshDecisionData()
}

const withdrawApplicationAction = async () => {
  if (!applicationNumber.value) { return }
  await withdrawApplication(applicationNumber.value, isProvisionalApplication.value)
  await refreshDecisionData()
}

const suspendRegistrationAction = async () => {
  await updateRegistrationStatus(
    activeReg.value.id,
    RegistrationStatus.SUSPENDED
  )
  await refreshDecisionData()
}

// Reinstates a cancelled/suspended registration by re-applying the ACTIVE status
const reinstateRegistration = async () => {
  await applyActiveApprovalStatus()
}

const sendNoticeAction = async () => {
  // validate email form
  if (!await isDecisionEmailValid()) { return }

  if (isApplication?.value) {
    if (!applicationNumber.value) { return }
    await sendNoticeOfConsideration(applicationNumber.value, decisionEmailContent.value.content)
  } else {
    await sendNoticeOfConsiderationForRegistration(
      activeReg.value!.id,
      decisionEmailContent.value.content
    )
  }
  decisionEmailContent.value.content = ''
  await refreshDecisionData()
}

const actionButtons: ConnectBtnControlItem[] = [
  {
    action: () => applyActiveApprovalStatus(),
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
    action: () => cancelRegistrationAction(),
    label: ApplicationActionsE.REJECT,
    color: 'red',
    icon: 'i-mdi-close'
  },
  {
    action: () => withdrawApplicationAction(),
    label: ApplicationActionsE.WITHDRAW,
    color: 'primary',
    icon: 'i-mdi-undo'
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
  await assignCurrentRecord()
  await refreshDecisionData()
}

const unassign = async () => {
  if (isAssignedToUser.value) {
    await unassignCurrentRecord()
    await refreshDecisionData()
  } else {
    openConfirmActionModal(
      t('modal.unassign.title'),
      t('modal.unassign.message'),
      t('strr.label.unAssign'),
      async () => {
        closeConfirmActionModal()
        await unassignCurrentRecord()
        await refreshDecisionData()
      }
    )
  }
}

const setAside = async () => {
  if (isApplication?.value) {
    if (!applicationNumber.value) { return }
    await useExaminerStore().setAsideApplication(applicationNumber.value)
  } else {
    await setAsideRegistration(activeReg.value.id)
  }
  await refreshDecisionData()
}

const handleSetAside = () => withNoteCheck(() => setAside())
const handleMainAction = () => withNoteCheck(() => selectedAction.value?.action())
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
              @click="handleSetAside"
            />
          </div>
        </div>
        <div>
          <div class="flex justify-center gap-4 md:justify-end">
            <UButton
              v-if="activeHeader?.assignee?.username"
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
              :label="isApplication
                ? selectedAction?.label === ApplicationActionsE.APPROVE
                  ? t('btn.approveApplication')
                  : t(`btn.${selectedAction?.label}`)
                : isRegApproved && isApproveDecisionSelected
                  ? t('btn.updateApproval')
                  : t(`btn.${selectedAction?.label}`)"
              :color="(selectedAction?.color || 'primary') as any"
              :icon="selectedAction?.icon"
              :disabled="isMainActionDisabled"
              variant="outline"
              class="max-w-fit px-7 py-3"
              data-testid="main-action-button"
              @click="handleMainAction"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
