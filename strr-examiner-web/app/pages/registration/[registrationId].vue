<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const { manageAction } = useExaminerActions()
const { updateRouteAndButtons } = useExaminerRoute()
const { updateRegistrationStatus, getRegistrationById } = useExaminerStore()

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
  action: 'CANCEL' | 'SUSPEND',
  buttonPosition: 'left' | 'right',
  buttonIndex: number
) => {
  const status = action === 'CANCEL' ? RegistrationStatus.CANCELLED : RegistrationStatus.SUSPENDED
  return manageAction(
    { id },
    action,
    updateRegistrationStatus,
    buttonPosition,
    buttonIndex,
    refresh,
    [status]
  )
}

watch(
  [registration, error],
  () => {
    initialMount.value = false

    updateRouteAndButtons(RoutesE.REGISTRATION, {
      cancel: {
        action: (id: number) => handleRegistrationAction(id, 'CANCEL', 'right', 1),
        label: t('btn.cancel')
      },
      suspend: {
        action: (id: number) => handleRegistrationAction(id, 'SUSPEND', 'right', 0),
        label: t('btn.suspend')
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
    <ApplicationDetailsView
      v-else
    >
      <template #header>
        <RegistrationInfoHeader />
      </template>
    </ApplicationDetailsView>
  </div>
</template>
