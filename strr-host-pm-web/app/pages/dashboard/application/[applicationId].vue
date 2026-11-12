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
  permitDetails,
  isPaidApplication,
  showPermitDetails
} = storeToRefs(permitStore)
const { unitAddress } = storeToRefs(useHostPropertyStore())

const { owners, setupBreadcrumbs, setupOwners } = useDashboardPage()

const todos = ref<Todo[]>([])
const showBusinessLicenseAlert = ref(false)

const hasEmailDeliveryFailure = computed(() => {
  const app = application.value as any
  return Boolean(
    app?.hasEmailDeliveryFailure ||
    app?.has_email_delivery_failure ||
    app?.header?.hasEmailDeliveryFailure ||
    app?.header?.has_email_delivery_failure
  )
})

onMounted(async () => {
  loading.value = true
  const applicationId = route.params.applicationId as string
  // Skip loading registration - this is an application-only dashboard
  await permitStore.loadHostData(applicationId, false, true)

  todos.value.push(...getTodoApplication(
    '/application',
    '/dashboard/application/' + application.value?.header.applicationNumber,
    application.value?.header,
    ApplicationType.HOST
  ))

  // Check if business license alert should be shown relying only on application data
  showBusinessLicenseAlert.value = permitStore.checkBusinessLicenseRequirement(application.value)

  if (!permitDetails.value || !showPermitDetails.value) {
    title.value = t('strr.title.dashboard')
  } else {
    // Set left side of header
    title.value = permitDetails.value.unitAddress.nickname || t('strr.label.unnamed')
    subtitles.value = [{ text: getAddressDisplayParts(unitAddress.value.address, true).join(', ') }]

    // Set header details based on application status
    setHeaderDetails(
      application.value?.header.hostStatus,
      undefined,
      isPaidApplication.value ? permitStore.downloadApplicationReceipt : undefined
    )

    // Set right side details based on application only
    setSideHeaderDetails(undefined, application.value?.header)

    // Set sidebar accordion reps
    setupOwners()

    // Update breadcrumbs
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
    await $router.push(`/${$i18n.locale.value}/dashboard-new`)
    return true
  }
})
</script>

<template>
  <div
    id="host-application-dashboard-page"
    data-test-id="host-application-dashboard-page"
    class="flex flex-col gap-5 py-8 sm:flex-row sm:py-10"
  >
    <div class="flex-1 space-y-10">
      <UAlert
        v-if="hasEmailDeliveryFailure && !loading"
        color="yellow"
        icon="i-mdi-email-alert-outline"
        :close-button="null"
        variant="subtle"
        data-test-id="host-email-delivery-failure-banner"
        :ui="{
          inner: 'pt-0',
          icon: {
            base: 'flex-shrink-0 w-5 h-5 self-start'
          }
        }"
      >
        <template #title>
          <span class="text-black">
            <span class="font-bold">{{ t('alert.emailDeliveryFailure.title') }}</span>
            {{ t('alert.emailDeliveryFailure.description') }}
          </span>
        </template>
      </UAlert>
      <DashboardTodoSection :todos="todos" :loading="loading" />
      <DashboardRentalSection :loading="loading" />
      <DashboardSupportingInfoSection
        :loading="loading"
        :needs-business-license-document-upload="showBusinessLicenseAlert"
      />
    </div>
    <DashboardSidebar
      :loading="loading"
      :show-permit-details="showPermitDetails"
      :owners="owners"
    >
      <template #terms-conditions>
        <ApplicationTermsConditions v-if="!loading" />
      </template>
    </DashboardSidebar>
  </div>
</template>
