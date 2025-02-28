<script setup lang="ts">
const strrModal = useStrrModals()
const localePath = useLocalePath()
const { t } = useI18n()
const route = useRoute()
const { approveApplication, rejectApplication, getNextApplication, getApplicationById } = useExaminerStore()
const { setButtonControl, handleButtonLoading } = useButtonControl()

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

// approve/reject/other? applications and refresh data
const manageApplication = async (
  id: string, action: 'approve' | 'reject',
  buttonPosition: 'left' | 'right',
  buttonIndex: number
) => {
  try {
    // update bottom buttons to loading state
    handleButtonLoading(false, buttonPosition, buttonIndex)

    if (action === 'approve') {
      await approveApplication(id)
    } else if (action === 'reject') {
      await rejectApplication(id)
    } // other actions

    // fetch new application on success success
    refresh()
  } catch (error) {
    console.error(error)
    // TODO: improve error message/flow
    strrModal.openErrorModal('Error', 'An error occurred approving or rejecting this application.', false)
  } finally {
    // reset bottom buttons loading state
    handleButtonLoading(true)
  }
}

// update route and bottom buttons when new application
watch(
  [application, error],
  ([newVal, _]) => {
    // if watch triggered, this means initial page mount is complete, set flag to false
    initialMount.value = false

    if (newVal && newVal.header.applicationNumber) {
      // update route slug with new application id
      window.history.replaceState(
        history.state,
        '',
        localePath(`${RoutesE.EXAMINE}/${newVal.header.applicationNumber}`)
      )

      // set buttons actions to use new application id
      if (newVal.registration.registrationType === ApplicationType.HOST ||
        newVal.registration.registrationType === ApplicationType.STRATA_HOTEL) { // TODO: what to do with platforms ?
        setButtonControl({
          leftButtons: [],
          rightButtons: [
            {
              action: () => manageApplication(newVal.header.applicationNumber, 'reject', 'left', 0),
              label: t('btn.decline'),
              variant: 'outline',
              color: 'red',
              icon: 'i-mdi-close'
            },
            {
              action: () => manageApplication(newVal.header.applicationNumber, 'approve', 'right', 1),
              label: t('btn.approve'),
              variant: 'outline',
              color: 'green',
              icon: 'i-mdi-check'
            }
          ]
        })
      } else {
        setButtonControl({ leftButtons: [], rightButtons: [] })
      }
    }
  }
)
</script>
<template>
  <div class="app-body">
    <ConnectSpinner
      v-if="initialMount || status === 'pending'"
      overlay
    />
    <!-- TODO: improve error state -->
    <div v-else-if="error" class="m-auto flex max-w-screen-sm flex-col">
      <ConnectPageSection
        :heading="{
          label: 'Error Fetching Application',
          labelClass: 'text-lg font-bold text-gray-900',
          icon: 'i-mdi-alert-circle-outline',
          iconClass: 'text-red-600 size-6 shrink-0',
          padding: 'sm:px-8 py-4 px-4'
        }"
      >
        <div class="flex flex-col space-y-2 p-10 text-left">
          <span>Status: {{ error.statusCode }}</span>
          <pre>Details: {{ error.data }}</pre>
          <UButton
            label="Return to Dashboard"
            :to="localePath(RoutesE.DASHBOARD)"
            icon="i-mdi-home"
            :block="true"
          />
          <UButton
            label="Try Again"
            icon="i-mdi-refresh"
            :block="true"
            @click="() => {
              initialMount = true
              refresh()
            }"
          />
        </div>
      </ConnectPageSection>
    </div>
    <ApplicationDetailsView
      v-else
      :application="application"
    >
      <template #header>
        <ApplicationInfoHeader :application="application" />
      </template>
    </ApplicationDetailsView>
  </div>
</template>
