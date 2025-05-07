<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const { manageAction } = useExaminerActions()
const { updateRouteAndButtons } = useExaminerRoute()
const {
  approveApplication,
  rejectApplication,
  getNextApplication,
  getApplicationById,
  sendNoticeOfConsideration,
  assignApplication
} = useExaminerStore()
const { openConfirmActionModal, close: closeConfirmActionModal } = useStrrModals()
const { nocContent, nocFormRef, activeHeader, isAssignedToUser } = storeToRefs(useExaminerStore())
const confirmErrorModal = ref<ConfirmModal | null>(null)

useHead({
  title: t('page.dashboardList.title')
})

definePageMeta({
  layout: 'examine',
  middleware: ['auth']
})

const initialMount = ref(true) // flag for whether to fetch next or specific application on mount - true until initial application is loaded

const { data: application, status, error, refresh } = await useLazyAsyncData<
  HousApplicationResponse | undefined, ApplicationError
>(
  'application-details-view',
  async () => {
    const slug = route.params.applicationId as string | undefined
    // On initial mount, if the applicationId is not 'startNew', try to fetch specific application by id
    if (initialMount.value && slug && slug !== 'startNew') {
      return await getApplicationById(slug)
    }
    // if slug is 'startNew' (navigated to Examine tab) - get next application
    if (slug && slug === 'startNew') {
      return await getNextApplication<HousApplicationResponse>()
    }
    // refresh the application with new data
    return await getApplicationById(route.params.applicationId as string)
  }
)

const handleApplicationAction = (
  id: string,
  action: ApplicationActionsE,
  buttonPosition: 'left' | 'right',
  buttonIndex: number
) => {
  let actionFn
  let validateFn
  let refreshFn = refresh
  let additionalArgs: any[] = []
  if (action === ApplicationActionsE.SEND_NOC) {
    actionFn = sendNoticeOfConsideration
    refreshFn = () => {
      nocContent.value.content = ''
      refresh()
    }
    additionalArgs = [nocContent.value.content]
    validateFn = async () => await validateForm(nocFormRef.value, true).then(errors => !errors)
  } else if (action === ApplicationActionsE.APPROVE || action === ApplicationActionsE.PROVISIONAL_APPROVE) {
    actionFn = approveApplication
  } else if (action === ApplicationActionsE.REJECT) {
    actionFn = rejectApplication
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
  id: string,
  action: ApplicationActionsE,
  buttonPosition: 'left' | 'right',
  buttonIndex: number
) => {
  if (isAssignedToUser.value) {
    if (action === ApplicationActionsE.APPROVE || action === ApplicationActionsE.PROVISIONAL_APPROVE) {
      openConfirmActionModal(
        t('modal.approveApplication.title'),
        t('modal.approveApplication.message'),
        t('btn.yesApprove'),
        () => {
          closeConfirmActionModal() // for smoother UX, close the modal before initiating the action
          handleApplicationAction(id, action, buttonPosition, buttonIndex)
        }
      )
    } else if (action === ApplicationActionsE.SEND_NOC) {
      openConfirmActionModal(
        t('modal.sendNotice.title'),
        t('modal.sendNotice.message'),
        t('btn.yesSend'),
        () => {
          closeConfirmActionModal() // for smoother UX, close the modal before initiating the action
          handleApplicationAction(id, action, buttonPosition, buttonIndex)
        }
      )
    } else {
      return handleApplicationAction(id, action, buttonPosition, buttonIndex)
    }
  } else if (confirmErrorModal.value) {
    confirmErrorModal.value.handleOpen(
      () => { refresh() }
    )
    return Promise.resolve()
  }
}

// update route and bottom buttons when new application
watch(
  [application, error, isAssignedToUser],
  () => {
    // During initial loading, auto assign application to current examiner if no reviewer exists
    if (initialMount.value && activeHeader.value && !activeHeader.value.reviewer?.username) {
      assignApplication(activeHeader.value.applicationNumber!).then(() => {
        refresh()
      })
    }
    // if watch triggered, this means initial page mount is complete, set flag to false
    initialMount.value = false
    updateRouteAndButtons(RoutesE.EXAMINE, {
      approve: {
        action: (id: string) => handleAssigneeAction(id, ApplicationActionsE.APPROVE, 'right', 1),
        label: t('btn.approve'),
        disabled: !isAssignedToUser.value
      },
      reject: {
        action: (id: string) => handleAssigneeAction(id, ApplicationActionsE.REJECT, 'right', 0),
        label: t('btn.decline'),
        disabled: !isAssignedToUser.value
      },
      sendNotice: {
        action: (id: string) => handleAssigneeAction(id, ApplicationActionsE.SEND_NOC, 'right', 0),
        label: t('btn.sendNotice'),
        disabled: !isAssignedToUser.value
      },
      provisionalApprove: {
        action: (id: string) => handleAssigneeAction(id, ApplicationActionsE.PROVISIONAL_APPROVE, 'right', 0),
        label: t('btn.approveApplication'),
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
      item-type="Application"
      :on-retry="() => {
        initialMount = true
        refresh()
      }"
    />
    <template v-else>
      <ApplicationDetailsView>
        <template #header>
          <ApplicationInfoHeader />
        </template>
      </ApplicationDetailsView>
      <ComposeNoc />
      <AssignmentActions @refresh="refresh" />
      <ConfirmationModal
        ref="confirmErrorModal"
        :is-open="false"
        :title="t('modal.assignError.title')"
        :message="t('modal.assignError.message')"
        :confirm-text="t('strr.label.acknowledgeError')"
        :disable-cancel="true"
      />
    </template>
  </div>
</template>
