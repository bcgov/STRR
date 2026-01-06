<script setup lang="ts">
const { t } = useNuxtApp().$i18n
const localePath = useLocalePath()
const {
  loading,
  title,
  subtitles
} = storeToRefs(useConnectDetailsHeaderStore())
const permitStore = useHostPermitStore()
const {
  registration,
  permitDetails,
  showPermitDetails,
  selectedRegistrationId,
  needsBusinessLicenseDocumentUpload
} = storeToRefs(permitStore)
const { unitAddress } = storeToRefs(useHostPropertyStore())

const { owners, setupBreadcrumbs, setupOwners } = useDashboardPage()

const {
  todos,
  hasPendingRenewalProcessing,
  addNocTodo,
  addBusinessLicenseTodo,
  setupRenewalTodosWatch
} = useDashboardTodos()

setupRenewalTodosWatch()

const submittedApplications = computed(() => {
  const apps = (registration.value as any)?.header?.applications || []
  return apps.filter((app: any) => app.applicationStatus !== 'DRAFT')
})

onMounted(async () => {
  loading.value = true
  // Use the registration ID stored before navigation (not the registration number in URL)
  // If not in store, try sessionStorage (survives external payment redirect)
  if (!selectedRegistrationId.value) {
    const storedId = sessionStorage.getItem('selectedRegistrationId')
    if (storedId) {
      selectedRegistrationId.value = storedId
      sessionStorage.removeItem('selectedRegistrationId') // Clean up after use
    }
  }

  if (!selectedRegistrationId.value) {
    // If still no ID, redirect to dashboard
    await navigateTo(localePath('/dashboard-new'))
    return
  }
  await permitStore.loadHostRegistrationData(selectedRegistrationId.value)

  addNocTodo()
  addBusinessLicenseTodo()

  if (!permitDetails.value || !showPermitDetails.value) {
    title.value = t('strr.title.dashboard')
  } else {
    title.value = permitDetails.value.unitAddress.nickname || t('strr.label.unnamed')
    subtitles.value = [{ text: getAddressDisplayParts(unitAddress.value.address, true).join(', ') }]

    // set header details based on registration
    setHeaderDetails(
      registration.value?.status,
      undefined,
      undefined,
      undefined,
      hasPendingRenewalProcessing.value)

    // host right side details
    setSideHeaderDetails(registration.value, undefined)

    // set sidebar accordion reps
    setupOwners()

    // update breadcrumbs
    setupBreadcrumbs()
  }

  loading.value = false
})

useHead({
  title: t('strr.title.dashboard')
})

definePageMeta({
  layout: 'connect-dashboard',
  middleware: ['auth', 'check-tos', 'require-account', 'dashboard-redirect'],
  onAccountChange: async () => {
    const { $router, $i18n } = useNuxtApp()
    await $router.push(`/${$i18n.locale.value}/dashboard`)
    return true
  }
})
</script>
<template>
  <div
    id="host-registration-dashboard-page"
    data-test-id="host-registration-dashboard-page"
    class="flex flex-col gap-5 py-8 sm:flex-row sm:py-10"
  >
    <div class="flex-1 space-y-10">
      <DashboardTodoSection
        :todos="todos"
        :loading="loading"
        :show-renewal-submitted="hasPendingRenewalProcessing"
      />
      <DashboardRentalSection :loading="loading" />
      <DashboardSupportingInfoSection
        :loading="loading"
        :needs-business-license-document-upload="needsBusinessLicenseDocumentUpload"
      />
      <ConnectDashboardSection
        v-if="submittedApplications.length > 0"
        id="submitted-applications-section"
        data-test-id="submitted-applications-section"
        :title="$t('strr.label.submittedApplications')"
        :loading="loading"
        icon="i-mdi-history"
      >
        <RegistrationSubmittedApplications
          :applications="submittedApplications"
        />
      </ConnectDashboardSection>
    </div>
    <DashboardSidebar
      :loading="loading"
      :show-permit-details="showPermitDetails"
      :owners="owners"
    />
  </div>
</template>
