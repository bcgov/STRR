<script setup lang="ts">
const { t } = useNuxtApp().$i18n
const config = useRuntimeConfig().public
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

const { isNewDashboardEnabled } = useHostFeatureFlags()

const {
  todos,
  addNocTodo,
  addBusinessLicenseTodo,
  setupRenewalTodosWatch
} = useDashboardTodos()

setupRenewalTodosWatch()

const owners = ref<ConnectAccordionItem[]>([])

const submittedApplications = computed(() => {
  const apps = (registration.value as any)?.header?.applications || []
  return apps.filter((app: any) => app.applicationStatus !== 'DRAFT')
})

// Check if there's a pending renewal application (PAID or FULL_REVIEW status)
const hasPendingProcessing = computed(() => {
  const apps = (registration.value as any)?.header?.applications || []
  if (apps.length === 0) {
    return false
  }
  const latestApp = apps[0]
  const pendingStatuses = ['PAID', 'FULL_REVIEW']
  return latestApp?.applicationType === 'renewal' &&
    pendingStatuses.includes(latestApp?.applicationStatus)
})

onMounted(async () => {
  loading.value = true
  // Use the registration ID stored before navigation (not the registration number in URL)
  if (!selectedRegistrationId.value) {
    // If no ID in store redirect to dashboard
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
      hasPendingProcessing.value)

    // host right side details
    setSideHeaderDetails(registration.value, undefined)

    // set sidebar accordion reps
    owners.value = getHostPermitDashOwners()

    // update breadcrumbs
    setBreadcrumbs([
      {
        label: t('label.bcregDash'),
        to: config.registryHomeURL + 'dashboard',
        appendAccountId: true,
        external: true
      },
      {
        label: t('strr.title.dashboard'),
        to: localePath(isNewDashboardEnabled.value ? '/dashboard-new' : '/dashboard')
      },
      { label: permitDetails.value.unitAddress.nickname || t('strr.label.unnamed') }
    ])
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
      <ConnectDashboardSection
        id="to-do-section"
        data-test-id="todo-section"
        :title="$t('label.todo')"
        :title-num="todos.length"
        :loading="loading"
      >
        <TodoEmpty v-if="!todos.length" data-test-id="todo-empty" />
        <template v-else>
          <template v-for="(todo, index) in todos" :key="todo.title">
            <Todo
              :id="todo.id"
              :title="todo.title"
              :subtitle="todo.subtitle"
              :buttons="todo?.buttons"
              :icon="todo?.icon"
              :icon-class="todo?.iconClass"
            />
            <div v-if="index < todos.length - 1" class="h-px w-full border-b border-gray-100" />
          </template>
        </template>
      </ConnectDashboardSection>
      <ConnectDashboardSection
        id="short-term-rental-section"
        data-test-id="rental-section"
        :title="$t('strr.label.shortTermRental')"
        :loading="loading"
      >
        <SummaryProperty class="px-10 py-5" data-test-id="summary-property" />
      </ConnectDashboardSection>
      <ConnectDashboardSection
        id="supporting-info-section"
        data-test-id="supporting-info-section"
        :title="$t('strr.label.supportingInfo')"
        :loading="loading"
      >
        <UAlert
          v-if="needsBusinessLicenseDocumentUpload"
          color="yellow"
          icon="i-mdi-alert"
          :close-button="null"
          variant="subtle"
          :ui="{
            inner: 'pt-0',
            icon: {
              base: 'flex-shrink-0 w-5 h-5 self-start'
            }
          }"
        >
          <template #title>
            <span class="text-black">
              <span class="font-bold">{{ t('alert.businessLicense.title') }}</span>
              {{ t('alert.businessLicense.description') }}
            </span>
          </template>
        </UAlert>
        <SummarySupportingInfo
          id="summary-supporting-info"
          class="px-10 py-5"
          data-test-id="summary-supporting-info"
          is-dashboard
        />
      </ConnectDashboardSection>
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
    <div class="space-y-10 sm:w-[300px]">
      <RegistrationTermsConditions
        v-if="!loading"
      />
      <ConnectDashboardSection
        id="individuals-business-section"
        data-test-id="individuals-business-section"
        :title="$t('strr.label.individualsBusinesses')"
        :loading="loading"
      >
        <ConnectAccordion
          v-if="showPermitDetails"
          :items="owners"
          multiple
          data-test-id="owners-accordion"
        />
        <div v-else class="w-full bg-white p-5 opacity-50" data-test-id="complete-filing-message">
          <p class="text-sm">
            {{ $t('text.completeFilingToDisplay') }}
          </p>
        </div>
      </ConnectDashboardSection>
    </div>
  </div>
</template>
