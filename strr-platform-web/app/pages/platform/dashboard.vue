<script setup lang="ts">
const { t } = useI18n()
const accountStore = useConnectAccountStore()

const { loading, title, subtitles } = storeToRefs(useConnectDetailsHeaderStore())
const { loadPlatform } = useStrrPlatformStore()
const {
  activeApplicationInfo,
  activePlatform,
  isPaidApplication,
  isRegistration,
  showPlatformDetails
} = storeToRefs(useStrrPlatformStore())
const { platformBusiness } = storeToRefs(useStrrPlatformBusiness())
const { platformDetails } = storeToRefs(useStrrPlatformDetails())

const todos = ref<Todo[]>([])
const addresses = ref<ConnectAccordionItem[]>([])
const representatives = ref<ConnectAccordionItem[]>([])

watch(() => accountStore.currentAccount.id,
  () => {
    const { redirect } = useNavigate()
    redirect(useRuntimeConfig().public.registryHomeURL + 'dashboard')
  }
)

onMounted(async () => {
  loading.value = true
  await loadPlatform()
  // set header stuff
  if (!activePlatform.value || !showPlatformDetails.value) {
    // no registration or valid complete application under the account, set static header
    title.value = t('strr.title.dashboard')
    todos.value = [getTodoApplication('/platform/application', activeApplicationInfo.value)]
  } else {
    // existing registration or application under the account
    // set left side of header
    title.value = platformBusiness.value.legalName
    subtitles.value = [
      platformBusiness.value.homeJurisdiction,
      t(`strr.label.listingSize.${platformDetails.value.listingSize}`)
    ]
    if (!isRegistration.value) {
      setApplicationHeaderDetails(isPaidApplication.value, activeApplicationInfo.value?.hostStatus)
    } else {
      // @ts-expect-error - ts not picking up that it will have status attr in this case
      setRegistrationHeaderDetails(activePlatform.value.status)
    }
    // add common side details
    setSideHeaderDetails(
      platformBusiness.value,
      isRegistration.value ? activePlatform.value as ApiExtraRegistrationDetails : undefined,
      activeApplicationInfo.value)
    // add platform specific side details
    setPlatformSideHeaderDetails()
    // set sidebar accordian addresses
    addresses.value = getDashboardAddresses(platformBusiness.value)
    // set sidebar accordian reps
    representatives.value = getDashboardRepresentives()
    // update breadcrumbs with platform business name
    setBreadcrumbs([
      { label: t('label.bcregDash'), to: useRuntimeConfig().public.registryHomeURL + 'dashboard' },
      { label: platformBusiness.value.legalName }
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
  path: '/platform/dashboard',
  middleware: ['auth', 'check-tos', 'require-premium-account']
})

setBreadcrumbs([
  { label: t('label.bcregDash'), to: useRuntimeConfig().public.registryHomeURL + 'dashboard' },
  { label: t('strr.title.dashboard') }
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
          <div v-if="showPlatformDetails">
            <p v-for="brand in platformDetails.brands" :key="brand.name">
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
        <ConnectAccordion v-if="showPlatformDetails" :items="addresses" multiple />
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
        <ConnectAccordion v-if="showPlatformDetails" :items="representatives" multiple />
        <div v-else class="w-[300px] bg-white p-5 opacity-50">
          <p class="text-sm">
            {{ $t('text.completeFilingToDisplay') }}
          </p>
        </div>
      </ConnectDashboardSection>
    </div>
  </div>
</template>
