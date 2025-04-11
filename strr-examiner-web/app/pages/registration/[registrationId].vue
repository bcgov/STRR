<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const { manageAction } = useExaminerActions()
const { updateRouteAndButtons } = useExaminerRoute()
const { updateRegistrationStatus, getRegistrationById } = useExaminerStore()
const { isAssignedToUser } = storeToRefs(useExaminerStore())

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
const disableCancel = ref(false)

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
  // Mandatory confirmation modal for cancel action
  openConfirmModal({
    title: t('modal.cancelRegistration.title'),
    message: t('modal.cancelRegistration.message'),
    confirmText: t('btn.cancel'),
    cancelText: t('btn.back'),
    onConfirm: async () => {
      const status = RegistrationStatus.CANCELLED
      await manageAction(
        { id },
        action,
        updateRegistrationStatus,
        buttonPosition,
        buttonIndex,
        refresh,
        [status]
      )
    }
  })
  return Promise.resolve()
}

const handleAssigneeAction = (
  id: number,
  action: RegistrationActionsE,
  buttonPosition: 'left' | 'right',
  buttonIndex: number
) => {
  if (isAssignedToUser.value) {
    return handleRegistrationAction(
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

watch(
  [registration, error, isAssignedToUser],
  () => {
    initialMount.value = false

    updateRouteAndButtons(RoutesE.REGISTRATION, {
      cancel: {
        action: (id: number) => handleAssigneeAction(id, RegistrationActionsE.CANCEL, 'right', 0),
        label: t('btn.cancel'),
        disabled: !isAssignedToUser.value
      }
    }, true)
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
      <AssignmentActions :is-registration-page="true" @refresh="refresh" />
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
