<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const {
  loading
  // title,
  // subtitles
} = storeToRefs(useConnectDetailsHeaderStore())
// const { loadStrata } = useStrrStrataStore()
const {
//   activeApplicationInfo,
//   activePlatform,
//   isRegistration,
  showStrataDetails
} = storeToRefs(useStrrStrataStore())
// const { strataBusiness } = storeToRefs(useStrrStrataBusinessStore())
// const { strataDetails } = storeToRefs(useStrrStrataDetailsStore())

const todos = ref<Todo[]>([])
const addresses = ref<ConnectAccordionItem[]>([])
const representatives = ref<ConnectAccordionItem[]>([])

// onMounted(() => {
//   loading.value = true
//   const registrationId = route.params.registrationId as string
//   loadStrata(registrationId)
//   // set header stuff
//   if (!activePlatform.value || !showStrataDetails.value) {
//     // no registration or valid complete application under the account, set static header
//     title.value = t('strr.title.dashboard')
//     // TODO: verify for strata -- in this case it should always be a draft application
//     todos.value = [getTodoApplication()]
//   } else {
//     // existing registration or application under the account
//     // set left side of header
//     title.value = strataBusiness.value.legalName
//     subtitles.value = [
//       strataBusiness.value.homeJurisdiction
//       // TODO: number of units
//       // t(`strr.label.listingSize.${platformDetails.value.listingSize}`)
//     ]
//     if (!isRegistration.value) {
//       setApplicationHeaderDetails(isRegistration.value, activeApplicationInfo.value?.hostStatus)
//     } else {
//       // @ts-expect-error - ts not picking up that it will have status attr in this case
//       setRegistrationHeaderDetails(activePlatform.value.status)
//     }
//     // TODO: strata side details
//     // setSideHeaderDetails()
//     // set sidebar accordian addresses
//     addresses.value = getDashboardAddresses(strataBusiness.value)
//     // set sidebar accordian reps
//     representatives.value = getDashboardRepresentives()
//     // update breadcrumbs with platform business name
//     // setBreadcrumbs([
//     //   { label: t('label.bcregDash'), to: useRuntimeConfig().public.registryHomeURL + 'dashboard' },
//     //   { label: strataBusiness.value.legalName }
//     // ])
//   }

//   loading.value = false
// })

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
            <p v-for="brand in strataDetails.brands" :key="brand.name">
              {{ brand.name }} - {{ brand.website }}
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
