<script setup lang="ts">
const { t } = useNuxtApp().$i18n
const route = useRoute()
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
const { updatePaymentDetails } = useStrrApi()

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

const hasEmailDeliveryFailure = computed(() => {
  const reg = registration.value as any
  return Boolean(
    reg?.hasEmailDeliveryFailure ||
    reg?.has_email_delivery_failure ||
    reg?.header?.hasEmailDeliveryFailure ||
    reg?.header?.has_email_delivery_failure
  )
})

onMounted(async () => {
  loading.value = true
  let registrationLoaded = false

  // Check sessionStorage if returning from payment (survives external payment redirect)
  let returningFromPayment = false
  const renewalAppNumber = sessionStorage.getItem('renewalApplicationNumber')
  if (renewalAppNumber) {
    const storedId = permitStore.readStoredSelectedRegistrationId()
    if (storedId) {
      selectedRegistrationId.value = storedId
      returningFromPayment = true
      permitStore.clearStoredSelectedRegistrationId()
    }
    await updatePaymentDetails(renewalAppNumber)
    sessionStorage.removeItem('renewalApplicationNumber')
  }

  if (!returningFromPayment && route.params.registrationNumber) {
    // Direct deep-link or route navigation: resolve from URL registration number
    selectedRegistrationId.value = undefined
    registrationLoaded = await permitStore.loadHostRegistrationDataByRegistrationNumber(
      route.params.registrationNumber as string
    )
  }

  if (!selectedRegistrationId.value) {
    // If still no ID, redirect to dashboard
    await navigateTo(localePath('/dashboard-new'))
    return
  }
  if (!registrationLoaded) {
    await permitStore.loadHostRegistrationData(selectedRegistrationId.value)
  }

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
