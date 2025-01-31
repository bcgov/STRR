<script setup lang="ts">
const strrModal = useStrrModals()
const localePath = useLocalePath()
const { t } = useI18n()
const route = useRoute()
const { approveApplication, rejectApplication, getNextApplication } = useExaminerStore()
const { setButtonControl, handleButtonLoading } = useButtonControl()
const { $strrApi } = useNuxtApp()

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
  () => {
    const slug = route.params.applicationId as string | undefined
    // On initial mount, if the applicationId is not 'startNew', try to fetch specific application by id
    if (initialMount.value && slug && slug !== 'startNew') {
      return $strrApi<HousApplicationResponse>(`/applications/${slug}`)
    }
    // if slug is 'startNew' or refresh is executed, fetch next application
    return getNextApplication<HousApplicationResponse>()
  }
)

// approve/reject/other? applications and refresh data
const manageApplication = async (id: string, action: 'approve' | 'reject') => {
  try {
    // update bottom buttons to loading state
    handleButtonLoading(false, 'right', 1)

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
    strrModal.openErrorModal('Error', 'An error occured approving or rejecting this application.', false)
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
      if (newVal.registration.registrationType === ApplicationType.HOST) { // TODO: update when strata approval is ready (what to do with platforms ???)
        setButtonControl({
          leftButtons: [],
          rightButtons: [
            {
              action: () => manageApplication(newVal.header.applicationNumber, 'reject'),
              label: t('btn.decline'),
              variant: 'outline',
              color: 'red',
              icon: 'i-mdi-close'
            },
            {
              action: () => manageApplication(newVal.header.applicationNumber, 'approve'),
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
    <main v-else>
      <div class="bg-white">
        <ApplicationInfoHeader :application />
        <!-- TODO: other sub headers -->
        <HostSubHeader
          v-if="application?.registration.registrationType === ApplicationType.HOST"
          :application
        />

        <StrataSubHeader
          v-if="application?.registration.registrationType === ApplicationType.STRATA_HOTEL"
          :application
        />
        <!-- @open-expansion="manageExpansion" -->
        <PlatformSubHeader
          v-if="application?.registration.registrationType === ApplicationType.PLATFORM"
          :application
        />
      </div>

      <div class="app-inner-container space-y-10 py-10">
        <ConnectExpansionRoot />

        <!-- TODO: other supporting info -->
        <HostSupportingInfo
          v-if="application?.registration.registrationType === ApplicationType.HOST"
          :application
        />

        <StrataSupportingInfo
          v-if="application?.registration.registrationType === ApplicationType.STRATA_HOTEL"
          :application
        />

        <!--
          <PlatformDetailsView
          v-if="registration?.registrationType === ApplicationType.PLATFORM"
          :application="application"
        />-->
      </div>
    </main>
  </div>
</template>
