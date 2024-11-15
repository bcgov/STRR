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
const { downloadApplicationReceipt, loadStrata } = useStrrStrataStore()
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
const addresses = ref<ConnectAccordionItem[]>([])
const representatives = ref<ConnectAccordionItem[]>([])
const completingParty = ref<ConnectAccordionItem | undefined>(undefined)

onMounted(async () => {
  loading.value = true
  const registrationId = route.params.registrationId as string
  await loadStrata(registrationId)
  // set header stuff
  if (!permitDetails.value || !showPermitDetails.value) {
    // TODO: probably not ever going to get here? Filing would launch from the other account dashboard?
    title.value = t('strr.title.dashboard')
    todos.value = [getTodoApplication('/strata-hotel/application', application.value?.header)]
  } else {
    // existing registration or application under the account
    // set left side of header
    title.value = strataDetails.value.brand.name
    subtitles.value = [
      { text: `${strataDetails.value.numberOfUnits} ${t('strr.word.units')}` },
      {
        text: strataDetails.value.brand.website,
        icon: 'i-mdi-web',
        link: true,
        linkHref: strataDetails.value.brand.website
      }
    ]
    if (!registration.value) {
      setApplicationHeaderDetails(
        isPaidApplication.value ? downloadApplicationReceipt : undefined,
        application.value?.header.hostStatus)
    } else {
      setRegistrationHeaderDetails(permitDetails.value.status)
    }
    // strata side details
    setSideHeaderDetails(
      strataBusiness.value,
      registration.value ? permitDetails.value : undefined,
      application.value?.header)
    // set sidebar accordian addresses
    addresses.value = getDashboardAddresses(strataBusiness.value)
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
    </div>
    <div class="space-y-10">
      <ConnectDashboardSection :title="$t('word.addresses')" :loading="loading" class="*:w-[300px]">
        <ConnectAccordion v-if="showPermitDetails" :items="addresses" multiple />
        <div v-else class="space-y-4 bg-white p-5 opacity-50 *:space-y-2">
          <div>
            <p class="font-bold">
              {{ t('label.mailingAddress') }}
            </p>
            <div class="flex gap-2">
              <UIcon name="i-mdi-email-outline" class="mt-[2px]" />
              <p class="text-sm">
                {{ $t('text.completeFilingToDisplay') }}
              </p>
            </div>
          </div>
          <div>
            <p class="font-bold">
              {{ t('strr.label.registeredOfficeAttorney') }}
            </p>
            <p class="text-sm">
              {{ $t('text.completeFilingToDisplay') }}
            </p>
          </div>
        </div>
      </ConnectDashboardSection>
      <ConnectDashboardSection :title="$t('word.representatives')" :loading="loading">
        <ConnectAccordion v-if="showPermitDetails" :items="representatives" multiple />
        <div v-else class="w-[300px] bg-white p-5 opacity-50">
          <p class="text-sm">
            {{ $t('text.completeFilingToDisplay') }}
          </p>
        </div>
      </ConnectDashboardSection>
      <ConnectDashboardSection :title="$t('label.completingParty')" :loading="loading">
        <ConnectAccordion v-if="showPermitDetails && completingParty" :items="[completingParty]" />
        <div v-else-if="!showPermitDetails" class="w-[300px] bg-white p-5 opacity-50">
          <p class="text-sm">
            {{ $t('text.completeFilingToDisplay') }}
          </p>
        </div>
      </ConnectDashboardSection>
    </div>
  </div>
</template>
