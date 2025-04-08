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
  registration,
  permitDetails,
  isPaidApplication,
  showPermitDetails
} = storeToRefs(permitStore)
const { unitAddress } = storeToRefs(useHostPropertyStore())

const { isEligibleForRenewal, renewalDueDate, renewalDateCounter, isTestRenewalReg } = useRenewals()

const todos = ref<Todo[]>([])
const owners = ref<ConnectAccordionItem[]>([])

onMounted(async () => {
  loading.value = true
  const applicationId = route.params.applicationId as string
  await permitStore.loadHostData(applicationId)
  // set header stuff
  todos.value = getTodoApplication(
    '/application',
    '/dashboard/' + application.value?.header.applicationNumber,
    application.value?.header,
    ApplicationType.HOST
  )

  if (registration.value && (isEligibleForRenewal.value || isTestRenewalReg.value)) {
    const translationProps = {
      newLine: '<br/>',
      boldStart: '<strong>',
      boldEnd: '</strong>'
    }

    // label for the due days count
    const dueDateCount = renewalDateCounter.value < 0
      ? t('label.renewalOverdue')
      : t('label.renewalDayCount', renewalDateCounter.value)

    todos.value.push({
      id: 'todo-renew-registration',
      title: `${t('todos.renewal.title1')} ${renewalDueDate.value} ${t('todos.renewal.title2')} (${dueDateCount})`,
      subtitle: t(renewalDateCounter.value < 0
        ? 'todos.renewal.expired'
        : 'todos.renewal.expiresSoon', translationProps),
      button: {
        label: t('btn.renew'),
        action: () => {}
      }
    })
  }

  if (!permitDetails.value || !showPermitDetails.value) {
    // TODO: probably not ever going to get here? Filing would launch from the other account dashboard?
    title.value = t('strr.title.dashboard')
  } else {
    // existing registration or application under the account
    // set left side of header
    title.value = permitDetails.value.unitAddress.nickname || t('strr.label.unnamed')
    subtitles.value = [{ text: getAddressDisplayParts(unitAddress.value.address, true).join(', ') }]

    if (!registration.value) {
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

    // set sidebar accordian reps
    owners.value = getHostPermitDashOwners()

    // update breadcrumbs with strata business name
    setBreadcrumbs([
      {
        label: t('label.bcregDash'),
        to: config.registryHomeURL + 'dashboard',
        appendAccountId: true,
        external: true
      },
      { label: t('strr.title.dashboard'), to: localePath('/dashboard') },
      { label: permitDetails.value.unitAddress.nickname || t('strr.label.unnamed') }
    ])
  }

  loading.value = false
})

// page stuff
useHead({
  title: t('strr.title.dashboard')
})

definePageMeta({
  layout: 'connect-dashboard',
  middleware: ['auth', 'check-tos', 'require-account'],
  onAccountChange: async () => {
    const { $router, $i18n } = useNuxtApp()
    await $router.push(`/${$i18n.locale.value}/dashboard`)
    return true
  }
})

setBreadcrumbs([
  {
    label: t('label.bcregDash'),
    to: config.registryHomeURL + 'dashboard',
    appendAccountId: true,
    external: true
  },
  { label: t('strr.title.dashboard'), to: localePath('/dashboard') },
  { label: 'Item 1' }
])
</script>
<template>
  <div
    id="host-dashboard-page"
    data-test-id="host-dashboard-page"
    class="flex flex-col gap-5 py-8 sm:flex-row sm:py-10"
  >
    <div class="grow space-y-10">
      <ConnectDashboardSection
        id="to-do-section"
        data-test-id="todo-section"
        :title="$t('label.todo')"
        :title-num="todos.length"
        :loading="loading"
      >
        <TodoEmpty v-if="!todos.length" data-test-id="todo-empty" />
        <Todo
          v-for="todo in todos"
          :id="todo.id"
          :key="todo.title"
          :title="todo.title"
          :subtitle="todo.subtitle"
          :button="todo?.button"
        />
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
        <SummarySupportingInfo
          id="summary-supporting-info"
          class="px-10 py-5"
          data-test-id="summary-supporting-info"
        />
      </ConnectDashboardSection>
    </div>
    <div class="space-y-10 sm:w-[300px]">
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
