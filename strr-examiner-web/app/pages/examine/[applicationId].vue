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
  assignApplication,
  isCurrentUserAssignee
} = useExaminerStore()
const { nocContent, nocFormRef, activeHeader } = storeToRefs(useExaminerStore())
const {
  showConfirmModal,
  modalTitle,
  modalMessage,
  confirmButtonText,
  cancelButtonText,
  openConfirmModal,
  closeConfirmModal,
  handleConfirm
} = useConfirmationModal()

useHead({
  title: t('page.dashboardList.title')
})

definePageMeta({
  layout: 'examine',
  middleware: ['auth']
})

const initialMount = ref(true) // flag for whether to fetch next or specific application on mount - true until initial application is loaded
const disableCancel = ref(false)
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
  } else if (action === ApplicationActionsE.APPROVE) {
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

const handleAssigneeAction = async (
  id: string,
  action: ApplicationActionsE,
  buttonPosition: 'left' | 'right',
  buttonIndex: number
) => {
  const isAssignee = await isCurrentUserAssignee(id)
  if (isAssignee) {
    return handleApplicationAction(
      id,
      action,
      buttonPosition,
      buttonIndex
    )
  } else {
    disableCancel.value = true
    openConfirmModal({
      title: t('modal.assignError.title'),
      message: t('modal.assignError.message'),
      confirmText: t('strr.label.acknowlegeError'),
      onConfirm: () => {
        closeConfirmModal()
        refresh()
      }
    })
    return Promise.resolve()
  }
}

// update route and bottom buttons when new application
watch(
  [application, error],
  () => {
    // During initial loading, auto assign application to current examiner if no reviewer exists
    if (initialMount.value && activeHeader.value && !activeHeader.value.reviewer?.username && (
      activeHeader.value.status === ApplicationStatus.FULL_REVIEW ||
      activeHeader.value.status === ApplicationStatus.PROVISIONAL_REVIEW
    )) {
      assignApplication(activeHeader.value.applicationNumber!).then(() => {
        refresh()
      })
    }
    // if watch triggered, this means initial page mount is complete, set flag to false
    initialMount.value = false
    updateRouteAndButtons(RoutesE.EXAMINE, {
      approve: {
        action: (id: string) => handleAssigneeAction(id, ApplicationActionsE.APPROVE, 'right', 1),
        label: t('btn.approve')
      },
      reject: {
        action: (id: string) => handleAssigneeAction(id, ApplicationActionsE.REJECT, 'right', 0),
        label: t('btn.decline')
      },
      sendNotice: {
        action: (id: string) => handleAssigneeAction(id, ApplicationActionsE.SEND_NOC, 'right', 0),
        label: t('btn.sendNotice')
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
        :is-open="showConfirmModal"
        :title="modalTitle"
        :message="modalMessage"
        :confirm-button-text="confirmButtonText"
        :cancel-button-text="cancelButtonText"
        :hide-cancel="disableCancel"
        :on-confirm="handleConfirm"
        :on-cancel="closeConfirmModal"
      />
    </template>
  </div>
</template>
