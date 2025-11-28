<script setup lang="ts">
const { t } = useNuxtApp().$i18n
const route = useRoute()
const {
  loading,
  title,
  subtitles
} = storeToRefs(useConnectDetailsHeaderStore())
const permitStore = useHostPermitStore()
const {
  application,
  registration,
  permitDetails,
  isPaidApplication,
  showPermitDetails,
  needsBusinessLicenseDocumentUpload
} = storeToRefs(permitStore)
const { unitAddress } = storeToRefs(useHostPropertyStore())

const { owners, setupBreadcrumbs, setupOwners } = useDashboardPage()

const {
  todos,
  addNocTodo,
  addBusinessLicenseTodo,
  setupRenewalTodosWatch
} = useDashboardTodos()

setupRenewalTodosWatch()

onMounted(async () => {
  loading.value = true
  const applicationId = route.params.applicationId as string
  await permitStore.loadHostData(applicationId)

  todos.value.push(...getTodoApplication(
    '/application',
    '/dashboard/' + application.value?.header.applicationNumber,
    application.value?.header,
    ApplicationType.HOST
  ))

  addNocTodo()
  addBusinessLicenseTodo()

  if (!permitDetails.value || !showPermitDetails.value) {
    title.value = t('strr.title.dashboard')
  } else {
    // existing registration or application under the account
    // set left side of header
    title.value = permitDetails.value.unitAddress.nickname || t('strr.label.unnamed')
    subtitles.value = [{ text: getAddressDisplayParts(unitAddress.value.address, true).join(', ') }]

    // for Provisional Pending NOC the header details should be based on the application
    if (!registration.value || application.value?.header.status === ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING) {
      setHeaderDetails(
        application.value?.header.hostStatus,
        undefined,
        isPaidApplication.value ? permitStore.downloadApplicationReceipt : undefined)
    } else {
      setHeaderDetails(
        registration.value.status,
        undefined,
        permitStore.downloadApplicationReceipt)
    }

    // host right side details
    setSideHeaderDetails(registration.value, application.value?.header)

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
    id="host-dashboard-page"
    data-test-id="host-dashboard-page"
    class="flex flex-col gap-5 py-8 sm:flex-row sm:py-10"
  >
    <div class="flex-1 space-y-10">
      <DashboardTodoSection :todos="todos" :loading="loading" />
      <DashboardRentalSection :loading="loading" />
      <DashboardSupportingInfoSection
        :loading="loading"
        :needs-business-license-document-upload="needsBusinessLicenseDocumentUpload"
      />
    </div>
    <DashboardSidebar
      :loading="loading"
      :show-permit-details="showPermitDetails"
      :owners="owners"
    />
  </div>
</template>
