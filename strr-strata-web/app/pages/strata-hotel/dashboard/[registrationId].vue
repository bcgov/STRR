<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const {
  loading,
  title,
  subtitles
} = storeToRefs(useConnectDetailsHeaderStore())
const { loadStrata } = useStrrStrataStore()
const {
  activeApplicationInfo,
  activeStrata,
  isPaidApplication,
  isRegistration,
  showStrataDetails
} = storeToRefs(useStrrStrataStore())
const { strataBusiness } = storeToRefs(useStrrStrataBusinessStore())
const { strataDetails } = storeToRefs(useStrrStrataDetailsStore())

const todos = ref<Todo[]>([])
const addresses = ref<ConnectAccordionItem[]>([])
const representatives = ref<ConnectAccordionItem[]>([])

onMounted(async () => {
  loading.value = true
  const registrationId = route.params.registrationId as string
  await loadStrata(registrationId)
  // set header stuff
  if (!activeStrata.value || !showStrataDetails.value) {
    // TODO: probably not ever going to get here? Filing would launch from the other account dashboard?
    title.value = t('strr.title.dashboard')
    todos.value = [getTodoApplication('/strata-hotel/application', activeApplicationInfo.value)]
  } else {
    // existing registration or application under the account
    // set left side of header
    title.value = strataBusiness.value.legalName
    subtitles.value = [
      strataBusiness.value.homeJurisdiction,
      `${strataDetails.value.numberOfUnits} ${t('strr.word.units')}`
    ]
    if (!isRegistration.value) {
      setApplicationHeaderDetails(isPaidApplication.value, activeApplicationInfo.value?.hostStatus)
    } else {
      // @ts-expect-error - ts not picking up that it will have status attr in this case
      setRegistrationHeaderDetails(activeStrata.value.status)
    }
    // strata side details
    setSideHeaderDetails(
      strataBusiness.value,
      isRegistration.value ? activeStrata.value as ApiExtraRegistrationDetails : undefined,
      activeApplicationInfo.value)
    // set sidebar accordian addresses
    addresses.value = getDashboardAddresses(strataBusiness.value)
    // set sidebar accordian reps
    representatives.value = getDashboardRepresentives()
    // update breadcrumbs with strata business name
    setBreadcrumbs([
      { label: t('label.bcregDash'), to: useRuntimeConfig().public.registryHomeURL + 'dashboard' },
      { label: t('strr.title.dashboard'), to: useLocalePath()('/strata-hotel/dashboard') },
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
  { label: t('label.bcregDash'), to: useRuntimeConfig().public.registryHomeURL + 'dashboard' },
  { label: 'My Short Term Rental Registry', to: localePath('/strata-hotel/dashboard') },
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
      <ConnectDashboardSection :title="$t('strr.label.brandNames')" :loading="loading">
        <div class="space-y-3 p-5">
          <div v-if="showStrataDetails">
            <p>
              {{ strataDetails.brand.name }} - {{ strataDetails.brand.website }}
            </p>
          </div>
          <p v-else class="text-center">
            {{ $t('text.completeFilingToDisplay') }}
          </p>
        </div>
      </ConnectDashboardSection>
    </div>
    <div class="space-y-10">
      <ConnectDashboardSection :title="$t('word.addresses')" :loading="loading" class="*:w-[300px]">
        <ConnectAccordion v-if="showStrataDetails" :items="addresses" multiple />
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
        <ConnectAccordion v-if="showStrataDetails" :items="representatives" multiple />
        <div v-else class="w-[300px] bg-white p-5 opacity-50">
          <p class="text-sm">
            {{ $t('text.completeFilingToDisplay') }}
          </p>
        </div>
      </ConnectDashboardSection>
    </div>
  </div>
</template>
