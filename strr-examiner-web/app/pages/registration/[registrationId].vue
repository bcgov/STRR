<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const { manageAction } = useExaminerActions()
const { updateRouteAndButtons } = useExaminerRoute()
const { updateRegistrationStatus, getRegistrationById } = useExaminerStore()
const { isAssignedToUser } = storeToRefs(useExaminerStore())
const { openConfirmActionModal, close: closeConfirmActionModal } = useStrrModals()

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
  openConfirmActionModal(
    t('modal.cancelRegistration.title'),
    t('modal.cancelRegistration.message'),
    t('btn.cancelRegistration'),
    async () => {
      closeConfirmActionModal()
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
    },
    t('btn.back')
  )
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
      cancel: {
        action: (id: number) => handleAssigneeAction(id, RegistrationActionsE.CANCEL, 'right', 0),
        label: t('btn.cancelRegistration'),
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
      <AssignmentActions :is-registration-page="true" @refresh="refresh" />
    </template>
  </div>
</template>
