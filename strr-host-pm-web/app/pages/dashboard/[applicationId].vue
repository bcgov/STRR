<script setup lang="ts">
import { watch } from 'vue'

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
  showPermitDetails,
  needsBusinessLicenseDocumentUpload
} = storeToRefs(permitStore)
const { unitAddress } = storeToRefs(useHostPropertyStore())

const {
  isEligibleForRenewal,
  renewalDueDate,
  renewalDateCounter,
  isRenewalPeriodClosed
} = useRenewals()

const todos = ref<Todo[]>([])
const owners = ref<ConnectAccordionItem[]>([])
const isRenewalsEnabled = useFeatureFlags().isFeatureEnabled('enable-registration-renewals')

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

  if (registration.value?.nocStatus === RegistrationNocStatus.NOC_PENDING) {
    const translationProps = {
      newLine: '<br/>',
      boldStart: '<strong>',
      boldEnd: '</strong>',
      linkStart: "<button type='button'" +
        "onClick=\"document.getElementById('summary-supporting-info').scrollIntoView({ behavior: 'smooth' })\"" +
        "class='text-blue-500 underline'>",
      linkEnd: '</button>'
    }

    const nocEndDate = dateToString(permitDetails.value.nocEndDate as Date)

    todos.value.push({
      id: 'todo-reg-noc-add-docs',
      title: `${t('todos.registrationNoc.title1')} ${nocEndDate} ${t('todos.registrationNoc.title2')}`,
      subtitle: `${t('todos.registrationNoc.general', translationProps)}`
    })
  }

  // Add business license upload todo if conditions are met
  if (needsBusinessLicenseDocumentUpload.value) {
    const translationProps = {
      newLine: '<br/>',
      boldStart: '<strong>',
      boldEnd: '</strong>',
      linkStart: "<button type='button'" +
        "onClick=\"document.getElementById('summary-supporting-info').scrollIntoView({ behavior: 'smooth' })\"" +
        "class='text-blue-500 underline'>",
      linkEnd: '</button>',
      mailto: "<a href='mailto:STRregistry@gov.bc.ca' class='text-blue-500 underline'>STRregistry@gov.bc.ca</a>"
    }

    todos.value.push({
      id: 'todo-business-license-upload',
      title: t('todos.businessLicense.title'),
      subtitle: t('todos.businessLicense.subtitle', translationProps),
      icon: 'i-mdi-alert',
      iconClass: 'text-orange-500'
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

// watch for Registration Renewals props and update related ToDos
watch([isRenewalsEnabled, isRenewalPeriodClosed, registration, isEligibleForRenewal], () => {
  const translationProps = {
    newLine: '<br/>',
    boldStart: '<strong>',
    boldEnd: '</strong>'
  }

  if (isRenewalsEnabled.value && isRenewalPeriodClosed.value) {
    // todo for renewal period closed after 3 years without renewal
    todos.value.push({
      id: 'todo-renew-registration-closed',
      title: t('todos.renewalClosed.title'),
      subtitle: t('todos.renewalClosed.subtitle', translationProps)
    })
  } else if (isRenewalsEnabled.value && registration.value && isEligibleForRenewal.value) {
    const isOverdue = renewalDateCounter.value < 0
    // label for the due days count
    const dueDateCount = isOverdue
      ? t('label.renewalOverdue')
      : t('label.renewalDayCount', renewalDateCounter.value)

    todos.value.push({
      id: 'todo-renew-registration',
      title: `${t('todos.renewal.title1')} ${renewalDueDate.value} ${t('todos.renewal.title2')} (${dueDateCount})`,
      subtitle: t(isOverdue
        ? 'todos.renewal.expired'
        : 'todos.renewal.expiresSoon', translationProps),
      button: {
        label: t('btn.renew'),
        action: async () => {
          await navigateTo({
            path: localePath('/application'),
            query: { renew: 'true', registrationId: registration.value?.id }
          })
        }
      }
    })
  }
}, { immediate: true })

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
        <template v-else>
          <template v-for="(todo, index) in todos" :key="todo.title">
            <Todo
              :id="todo.id"
              :title="todo.title"
              :subtitle="todo.subtitle"
              :button="todo?.button"
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
