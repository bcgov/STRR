<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const { manageAction } = useExaminerActions()
const { updateRouteAndButtons } = useExaminerRoute()
const {
  updateRegistrationStatus,
  getRegistrationById,
  setAsideRegistration,
  sendNoticeOfConsiderationForRegistration
} = useExaminerStore()
const { isAssignedToUser, emailContent, emailFormRef } = storeToRefs(useExaminerStore())
const { openConfirmActionModal, close: closeConfirmActionModal } = useStrrModals()
const { showDecisionPanel } = useExaminerDecision()

useHead({
  title: t('page.dashboardList.title')
})

definePageMeta({
  layout: 'examine',
  middleware: ['auth']
})

const initialMount = ref(true)

const { data: registration, status, error, refresh } = await useLazyAsyncData<
  HousRegistrationResponse | undefined, ApplicationError
>(
  'registration-details-view',
  async () => {
    // slug will be there, otherwise the route will not be rendered and redirected to dashboard
    const slug = route.params.registrationId as string
    return await getRegistrationById(slug)
  }
)

const handleRegistrationAction = (
  id: number,
  action: RegistrationActionsE,
  buttonPosition: 'left' | 'right',
  buttonIndex: number
) => {
  let actionFn
  let refreshFn = refresh
  let additionalArgs: any[] = []
  let validateFn

  if (action === RegistrationActionsE.CANCEL) {
    actionFn = updateRegistrationStatus
    additionalArgs = [RegistrationStatus.CANCELLED, emailContent.value.content]
  } else if (action === RegistrationActionsE.REINSTATE || action === RegistrationActionsE.APPROVE) {
    actionFn = updateRegistrationStatus
    additionalArgs = [RegistrationStatus.ACTIVE]
  } else if (action === RegistrationActionsE.SET_ASIDE) {
    actionFn = setAsideRegistration
  } else if (action === RegistrationActionsE.SUSPEND) {
    actionFn = updateRegistrationStatus
    additionalArgs = [RegistrationStatus.SUSPENDED, emailContent.value.content]
  } else if (action === RegistrationActionsE.SEND_NOC) {
    actionFn = sendNoticeOfConsiderationForRegistration
    refreshFn = () => {
      emailContent.value.content = ''
      refresh()
    }
    additionalArgs = [emailContent.value.content]
    validateFn = async () => await validateForm(emailFormRef.value, true).then(errors => !errors)
  }

  return manageAction(
    { id },
    action,
    actionFn,
    buttonPosition,
    buttonIndex,
    refreshFn,
    additionalArgs,
    validateFn
  )
}

const handleAssigneeAction = (
  id: number,
  action: RegistrationActionsE,
  buttonPosition: 'left' | 'right',
  buttonIndex: number
) => {
  if (isAssignedToUser.value) {
    if (action === RegistrationActionsE.CANCEL) {
      openConfirmActionModal(
        t('modal.cancelRegistration.title'),
        t('modal.cancelRegistration.message'),
        t('btn.cancelRegistration'),
        () => {
          closeConfirmActionModal()
          handleRegistrationAction(id, action, buttonPosition, buttonIndex)
        },
        t('btn.back')
      )
    } else if (action === RegistrationActionsE.REINSTATE) {
      openConfirmActionModal(
        t('modal.reinstateRegistration.title'),
        t('modal.reinstateRegistration.message'),
        t('btn.yesReinstate'),
        () => {
          closeConfirmActionModal()
          handleRegistrationAction(id, action, buttonPosition, buttonIndex)
        },
        t('btn.cancel')
      )
    } else if (action === RegistrationActionsE.APPROVE) {
      openConfirmActionModal(
        t('modal.approveRegistration.title'),
        t('modal.approveRegistration.message'),
        t('btn.yesApprove'),
        () => {
          closeConfirmActionModal()
          handleRegistrationAction(id, action, buttonPosition, buttonIndex)
        },
        t('btn.cancel')
      )
    } else if (action === RegistrationActionsE.SUSPEND) {
      openConfirmActionModal(
        t('modal.suspendRegistration.title'),
        t('modal.suspendRegistration.message'),
        t('btn.yesSuspend'),
        () => {
          closeConfirmActionModal()
          handleRegistrationAction(id, action, buttonPosition, buttonIndex)
        },
        t('btn.cancel')
      )
    } else if (action === RegistrationActionsE.SEND_NOC) {
      openConfirmActionModal(
        t('modal.sendNotice.title'),
        t('modal.sendNotice.message'),
        t('btn.yesSend'),
        () => {
          closeConfirmActionModal()
          handleRegistrationAction(id, action, buttonPosition, buttonIndex)
        }
      )
    } else {
      return handleRegistrationAction(id, action, buttonPosition, buttonIndex)
    }
  } else {
    openConfirmActionModal(
      t('modal.assignError.title'),
      t('modal.assignError.message'),
      t('strr.label.acknowledgeError'),
      () => {
        closeConfirmActionModal()
        refresh()
      },
      t('btn.cancel'),
      true
    )
  }
}

watch(
  [registration, error, isAssignedToUser],
  () => {
    initialMount.value = false

    updateRouteAndButtons(RoutesE.REGISTRATION, {
      registrationSetAside: {
        action: (id: number) => handleAssigneeAction(id, RegistrationActionsE.SET_ASIDE, 'right', 0),
        label: t('btn.setAside'),
        disabled: !isAssignedToUser.value
      },
      registrationSendNotice: {
        action: (id: number) => handleAssigneeAction(id, RegistrationActionsE.SEND_NOC, 'right', 0),
        label: t('btn.sendNotice'),
        disabled: !isAssignedToUser.value
      },
      cancel: {
        action: (id: number) => handleAssigneeAction(id, RegistrationActionsE.CANCEL, 'right', 0),
        label: t('btn.cancelRegistration'),
        disabled: !isAssignedToUser.value
      },
      suspend: {
        action: (id: number) => handleAssigneeAction(id, RegistrationActionsE.SUSPEND, 'right', 0),
        label: t('btn.suspendRegistration'),
        disabled: !isAssignedToUser.value
      },
      registrationApprove: {
        action: (id: number) => handleAssigneeAction(id, RegistrationActionsE.APPROVE, 'right', 1),
        label: t('btn.approveRegistration'),
        disabled: !isAssignedToUser.value
      },
      reinstate: {
        action: (id: number) => handleAssigneeAction(id, RegistrationActionsE.REINSTATE, 'right', 1),
        label: t('btn.reinstateRegistration'),
        disabled: !isAssignedToUser.value
      }
    })
  }
)
</script>

<template>
  <div class="app-body">
    <ConnectSpinner
      v-if="initialMount || status === 'pending'"
      overlay
    />
    <ExaminerErrorState
      v-else-if="error"
      :error="error"
      item-type="Registration"
      :on-retry="() => {
        initialMount = true
        refresh()
      }"
    />
    <template v-else>
      <ApplicationDetailsView>
        <template #header>
          <RegistrationInfoHeader />
        </template>
      </ApplicationDetailsView>
      <ComposeNoc v-if="!showDecisionPanel" />
      <DecisionPanel />
      <AssignmentActions :is-registration-page="true" @refresh="refresh" />
    </template>
  </div>
</template>
