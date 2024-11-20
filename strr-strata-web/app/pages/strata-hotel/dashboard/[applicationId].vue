<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const config = useRuntimeConfig().public
const localePath = useLocalePath()
const {
  loading,
  title,
  subtitles
} = storeToRefs(useConnectDetailsHeaderStore())
const { downloadApplicationReceipt, loadStrata, $reset } = useStrrStrataStore()
const {
  application,
  registration,
  permitDetails,
  isPaidApplication,
  showPermitDetails
} = storeToRefs(useStrrStrataStore())
const { strataBusiness } = storeToRefs(useStrrStrataBusinessStore())
const { strataDetails } = storeToRefs(useStrrStrataDetailsStore())

const todos = ref<Todo[]>([])
const buildings = ref<ConnectAccordionItem[]>([])
const representatives = ref<ConnectAccordionItem[]>([])
const completingParty = ref<ConnectAccordionItem | undefined>(undefined)

onMounted(async () => {
  loading.value = true
  $reset()
  const applicationId = route.params.applicationId as string
  await loadStrata(applicationId)
  // set header stuff
  if (!permitDetails.value || !showPermitDetails.value) {
    // TODO: probably not ever going to get here? Filing would launch from the other account dashboard?
    title.value = t('strr.title.dashboard')
    todos.value = [getTodoApplication('/strata-hotel/application', application.value?.header)]
  } else {
    // existing registration or application under the account
    // set left side of header
    title.value = strataDetails.value.brand.name
    const nonPlural = strataDetails.value.numberOfUnits === 1
    subtitles.value = [
      { text: `${strataDetails.value.numberOfUnits} ${t('strr.word.unit', nonPlural ? 1 : 2)}` },
      {
        text: strataDetails.value.brand.website.replace(/^https?:\/\/(www\.)/, ''),
        icon: 'i-mdi-web',
        link: true,
        linkHref: strataDetails.value.brand.website
      }
    ]
    if (!registration.value) {
      setHeaderDetails(
        application.value?.header.hostStatus,
        undefined,
        isPaidApplication.value ? downloadApplicationReceipt : undefined)
    } else {
      setHeaderDetails(
        permitDetails.value.status,
        dateToStringPacific(permitDetails.value.expiryDate, 'DDD'),
        downloadApplicationReceipt)
    }
    // strata side details
    setSideHeaderDetails(
      strataBusiness.value,
      registration.value ? permitDetails.value : undefined,
      application.value?.header)
    // set sidebar accordian buildings
    buildings.value = getDashboardBuildings()
    // set sidebar accordian reps
    representatives.value = getDashboardRepresentives()
    // set side bar completing party
    completingParty.value = getDashboardCompParty()
    // update breadcrumbs with strata business name
    setBreadcrumbs([
      {
        label: t('label.bcregDash'),
        to: config.registryHomeURL + 'dashboard',
        appendAccountId: true,
        external: true
      },
      { label: t('strr.title.dashboard'), to: localePath('/strata-hotel/dashboard') },
      { label: strataBusiness.value.legalName }
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
  middleware: ['auth', 'require-account']
})

setBreadcrumbs([
  {
    label: t('label.bcregDash'),
    to: config.registryHomeURL + 'dashboard',
    appendAccountId: true,
    external: true
  },
  { label: t('strr.title.dashboard'), to: localePath('/strata-hotel/dashboard') },
  { label: 'Item 1' }
])
</script>
<template>
  <div class="flex flex-col gap-5 py-8 sm:flex-row sm:py-10">
    <div class="grow space-y-10">
      <ConnectDashboardSection :title="$t('label.todo')" :title-num="todos.length" :loading="loading">
        <TodoEmpty v-if="!todos.length" />
        <Todo
          v-for="todo in todos"
          :key="todo.title"
          :title="todo.title"
          :subtitle="todo.subtitle"
          :button="todo.button"
        />
      </ConnectDashboardSection>
      <ConnectDashboardSection :title="$t('strr.label.registeringBusiness')" :loading="loading">
        <div class="rounded p-3">
          <SummaryBusiness />
        </div>
      </ConnectDashboardSection>
      <ConnectDashboardSection :title="$t('strr.label.regOfficeAttSvc')" :loading="loading">
        <div class="rounded p-3">
          <SummaryRegOfficeAttorney />
        </div>
      </ConnectDashboardSection>
    </div>
    <div class="space-y-10 sm:w-[300px]">
      <ConnectDashboardSection :title="$t('label.completingParty')" :loading="loading">
        <ConnectAccordion v-if="showPermitDetails && completingParty" :items="[completingParty]" />
        <div v-else-if="!showPermitDetails" class="bg-white p-5 opacity-50">
          <p class="text-sm">
            {{ $t('text.completeFilingToDisplay') }}
          </p>
        </div>
      </ConnectDashboardSection>
      <ConnectDashboardSection :title="$t('word.representatives')" :loading="loading">
        <ConnectAccordion v-if="showPermitDetails" :items="representatives" multiple />
        <div v-else class="w-full bg-white p-5 opacity-50">
          <p class="text-sm">
            {{ $t('text.completeFilingToDisplay') }}
          </p>
        </div>
      </ConnectDashboardSection>
      <ConnectDashboardSection :title="$t('strr.label.building', 1)" :loading="loading">
        <ConnectAccordion v-if="showPermitDetails" :items="buildings" multiple />
        <div v-else class="bg-white p-5 opacity-50">
          <p class="text-sm">
            {{ $t('text.completeFilingToDisplay') }}
          </p>
        </div>
      </ConnectDashboardSection>
    </div>
  </div>
</template>
