<script setup lang="ts">
const { t } = useNuxtApp().$i18n
const route = useRoute()
const config = useRuntimeConfig().public
const localePath = useLocalePath()
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

const todos = ref<Todo[]>([])
const owners = ref<ConnectAccordionItem[]>([])
const showBusinessLicenseAlert = ref(false)

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
    owners.value = getHostPermitDashOwners()

    // Update breadcrumbs
    setBreadcrumbs([
      {
        label: t('label.bcregDash'),
        to: config.registryHomeURL + 'dashboard',
        appendAccountId: true,
        external: true
      },
      {
        label: t('strr.title.dashboard'),
        to: localePath('/dashboard-new')
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
  middleware: ['auth', 'check-tos', 'require-account'],
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
          v-if="showBusinessLicenseAlert"
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
    </div>
    <div class="space-y-10 sm:w-[300px]">
      <ApplicationTermsConditions
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
