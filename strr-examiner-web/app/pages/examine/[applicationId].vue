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
  sendNoticeOfConsideration
} = useExaminerStore()
const { nocContent, nocFormRef } = storeToRefs(useExaminerStore())

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

// update route and bottom buttons when new application
watch(
  [application, error],
  () => {
    // if watch triggered, this means initial page mount is complete, set flag to false
    initialMount.value = false
    updateRouteAndButtons(RoutesE.EXAMINE, {
      approve: {
        action: (id: string) => handleApplicationAction(id, ApplicationActionsE.APPROVE, 'right', 1),
        label: t('btn.approve')
      },
      reject: {
        action: (id: string) => handleApplicationAction(id, ApplicationActionsE.REJECT, 'right', 0),
        label: t('btn.decline')
      },
      sendNotice: {
        action: (id: string) => handleApplicationAction(id, ApplicationActionsE.SEND_NOC, 'right', 0),
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
    </template>
  </div>
</template>
