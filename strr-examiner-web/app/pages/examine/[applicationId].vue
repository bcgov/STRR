<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const { manageAction } = useExaminerActions()
const { updateRouteAndButtons } = useExaminerRoute()
const { approveApplication, rejectApplication, getNextApplication, getApplicationById } = useExaminerStore()

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
    // if slug is 'startNew' or refresh is executed, fetch next application
    return await getNextApplication<HousApplicationResponse>()
  }
)

const handleApplicationAction = (
  id: string,
  action: 'APPROVE' | 'REJECT',
  buttonPosition: 'left' | 'right',
  buttonIndex: number
) => {
  const actionFn = action === 'APPROVE' ? approveApplication : rejectApplication
  return manageAction(
    { id },
    action,
    actionFn,
    buttonPosition,
    buttonIndex,
    refresh,
    []
  )
}

// update route and bottom buttons when new application
watch(
  [application, error],
  () => {
    // if watch triggered, this means initial page mount is complete, set flag to false
    initialMount.value = false
    updateRouteAndButtons(RoutesE.EXAMINE, {
      approve: {
        action: (id: string) => handleApplicationAction(id, 'APPROVE', 'right', 0),
        label: t('btn.approve')
      },
      reject: {
        action: (id: string) => handleApplicationAction(id, 'REJECT', 'right', 1),
        label: t('btn.decline')
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
    <ApplicationDetailsView
      v-else
    >
      <template #header>
        <ApplicationInfoHeader />
      </template>
    </ApplicationDetailsView>
  </div>
</template>
