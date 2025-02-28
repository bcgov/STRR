<script setup lang="ts">
const strrModal = useStrrModals()
const localePath = useLocalePath()
const { t } = useI18n()
const route = useRoute()
const { setButtonControl, handleButtonLoading } = useButtonControl()
const { updateRegistrationStatus, getApplicationById } = useExaminerStore()

useHead({
  title: t('page.dashboardList.title')
})

definePageMeta({
  layout: 'examine',
  middleware: ['auth']
})

const initialMount = ref(true)

const { data: application, status, error, refresh } = await useLazyAsyncData<
  HousApplicationResponse | undefined, ApplicationError
>(
  'registration-details-view',
  async () => {
    // slug will be there, otherwise the route will not be rendered and redirected to dashboard
    const slug = route.params.applicationId as string
    return await getApplicationById(slug)
  }
)

const manageRegistration = async (
  id: number, action: 'cancel' | 'suspend',
  buttonPosition: 'left' | 'right',
  buttonIndex: number
) => {
  try {
    // update bottom buttons to loading state
    handleButtonLoading(false, buttonPosition, buttonIndex)

    if (action === 'cancel') {
      await updateRegistrationStatus(id, RegistrationStatus.CANCELLED)
    } else if (action === 'suspend') {
      await updateRegistrationStatus(id, RegistrationStatus.SUSPENDED)
    }

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

watch(
  [application, error],
  ([newVal, _]) => {
    initialMount.value = false

    if (newVal && newVal.header.applicationNumber) {
      window.history.replaceState(
        history.state,
        '',
        localePath(`${RoutesE.REGISTRATION}/${newVal.header.applicationNumber}`)
      )
    }
    if (newVal && newVal.header.registrationStatus !== RegistrationStatus.SUSPENDED &&
        newVal.header.registrationStatus !== RegistrationStatus.CANCELLED &&
        newVal.header.registrationStatus !== RegistrationStatus.EXPIRED) {
      setButtonControl({
        leftButtons: [],
        rightButtons: [
          {
            action: () => manageRegistration(newVal.header.registrationId!, 'cancel', 'left', 0),
            label: t('btn.cancel'),
            variant: 'outline',
            color: 'red',
            icon: 'i-mdi-close'
          },
          {
            action: () => manageRegistration(newVal.header.registrationId!, 'suspend', 'right', 1),
            label: t('btn.suspend'),
            variant: 'outline',
            color: 'blue',
            icon: 'i-mdi-pause'
          }
        ]
      })
    } else {
      setButtonControl({ leftButtons: [], rightButtons: [] })
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
        <RegistrationInfoHeader :application="application" />
      </template>
    </ApplicationDetailsView>
  </div>
</template>
