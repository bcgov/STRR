<script setup lang="ts">
const strrModal = useStrrModals()
const localePath = useLocalePath()
const { t } = useI18n()
const route = useRoute()
const { getAccountApplication } = useStrrApi()
const { approveApplication, rejectApplication, getNextApplication } = useExaminerStore()
const { setButtonControl, handleButtonLoading } = useButtonControl()

useHead({
  title: t('page.dashboardList.title')
})

definePageMeta({
  layout: 'examine',
  middleware: ['auth', 'require-account']
})

const initialMount = ref(true) // flag for whether to fetch next or specific application on mount - true until initial application is loaded
// const showExpansion = ref<boolean>(false) // show/hide expansion items
// const expansionItem = ref<ExpansionItem | undefined>(undefined) // expansion component to display
// const expansionProps: Ref<Record<string, unknown>> = ref({}) // any props passed to expansion components

// const manageExpansion = (e: OpenExpansionEvent) => {
//   expansionItem.value = e[0] // set expansion component to open
//   expansionProps.value = e[1] // bind any custom props
//   showExpansion.value = true
// }

// TODO: fix typing
const { data, status, error, refresh } = await useAsyncData<HousApplicationResponse>(
  'application-to-review',
  () => {
    const slug = route.params.applicationId as string | undefined
    // On initial mount, if the applicationId is not 'startNew', try to fetch specific application by id
    if (initialMount.value && slug && slug !== 'startNew') {
      return getAccountApplication(slug)
    }
    // if slug is 'startNew' or refresh is executed, fetch next application
    return getNextApplication()
  }
)

// workaround for typing - temporary
// TODO: remove once typing is fixed
const application = computed(() => data.value as HousApplicationResponse)

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
  () => application.value.header.applicationNumber,
  (newVal) => {
    if (newVal) {
      // update route slug with new application id
      window.history.replaceState(history.state, '', localePath(`${RoutesE.EXAMINE}/${newVal}`))
      // if watch triggered, this means initial page mount is complete, set flag to false
      initialMount.value = false

      // set buttons actions to use new application id
      setButtonControl({
        leftButtons: [],
        rightButtons: [
          {
            action: () => manageApplication(newVal, 'reject'),
            label: t('btn.decline'),
            variant: 'outline',
            color: 'red',
            icon: 'i-mdi-close'
          },
          {
            action: () => manageApplication(newVal, 'approve'),
            label: t('btn.approve'),
            variant: 'outline',
            color: 'green',
            icon: 'i-mdi-check'
          }
        ]
      })
    }
  },
  { immediate: true }
)
</script>
<template>
  <div class="app-body">
    <ConnectSpinner
      v-if="status === 'pending' || status === 'idle'"
      overlay
    />
    <!-- TODO: error state -->
    <div v-else-if="error">
      Some Error State
    </div>
    <main v-else>
      <div class="bg-white">
        <ApplicationInfoHeader
          :application
        />
        <!-- TODO: other sub headers -->
        <HostSubHeader
          v-if="application?.registration.registrationType === ApplicationType.HOST"
          :application
        />
        <!-- @open-expansion="manageExpansion" -->
      </div>

      <div class="app-inner-container space-y-10 py-10">
        <ConnectExpansionRoot />
        <!-- <ExpansionContainer
          v-model="showExpansion"
          v-bind="expansionProps"
          :application
          :expansion-item="expansionItem"
          @close="showExpansion = false"
        /> -->

        <!-- TODO: other supporting info -->
        <HostSupportingInfo
          v-if="application?.registration.registrationType === ApplicationType.HOST"
          :application
        />

        <!-- <PlatformDetailsView
      v-if="registration?.registrationType === ApplicationType.PLATFORM"
      :application="application"
    />

    <StrataHotelDetailsView
      v-if="registration?.registrationType === ApplicationType.STRATA_HOTEL"
      :application="application"
    /> -->
      </div>
    </main>
  </div>
</template>
<style scoped>
dl>dt {
  @apply font-bold text-black
}
</style>
