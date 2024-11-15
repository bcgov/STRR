<script setup lang="ts">
const { t } = useI18n()
const config = useRuntimeConfig().public
const accountStore = useConnectAccountStore()

const { loading, title, subtitles } = storeToRefs(useConnectDetailsHeaderStore())
const { downloadApplicationReceipt, loadPlatform, $reset } = useStrrPlatformStore()
const {
  application,
  registration,
  permitDetails,
  isPaidApplication,
  showPermitDetails
} = storeToRefs(useStrrPlatformStore())
const { platformBusiness } = storeToRefs(useStrrPlatformBusiness())
const { platformDetails } = storeToRefs(useStrrPlatformDetails())

const todos = ref<Todo[]>([])
const addresses = ref<ConnectAccordionItem[]>([])
const representatives = ref<ConnectAccordionItem[]>([])
const completingParty = ref<ConnectAccordionItem | undefined>(undefined)

watch(() => accountStore.currentAccount.id,
  (newVal) => {
    if (newVal !== undefined) {
      const { redirect } = useNavigate()
      redirect(config.registryHomeURL + 'dashboard')
    }
  }
)

onMounted(async () => {
  loading.value = true
  $reset()
  await loadPlatform()
  // set header stuff
  if (!permitDetails.value || !showPermitDetails.value) {
    // no registration or valid complete application under the account, set static header
    title.value = t('strr.title.dashboard')
    todos.value = [getTodoApplication('/platform/application', application.value?.header)]
  } else {
    // existing registration or application under the account
    // set left side of header
    title.value = platformBusiness.value.legalName
    subtitles.value = [
      { text: platformBusiness.value.homeJurisdiction },
      { text: t(`strr.label.listingSize.${platformDetails.value.listingSize}`) }
    ]
    if (!registration.value) {
      setHeaderDetails(
        application.value?.header.hostStatus,
        undefined,
        isPaidApplication.value ? downloadApplicationReceipt : undefined)
    } else {
      setHeaderDetails(
        permitDetails.value.status,
        dateToStringPacific(permitDetails.value.expiryDate, 'MMMM Do, YYYY'),
        downloadApplicationReceipt)
    }
    // add common side details
    setSideHeaderDetails(
      platformBusiness.value,
      registration.value ? permitDetails.value : undefined,
      application.value?.header)
    // add platform specific side details
    setPlatformSideHeaderDetails()
    // set sidebar accordian addresses
    addresses.value = getDashboardAddresses(platformBusiness.value)
    // platform specific address items (emails)
    addresses.value.push({
      showAvatar: false,
      label: t('strr.label.emailAddresses'),
      values: [
        {
          icon: 'i-mdi-at',
          label: t('strr.label.noncomplianceEmail'),
          text: platformBusiness.value.nonComplianceEmail
        },
        ...(platformBusiness.value.nonComplianceEmailOptional
          ? [{ class: '-mt-2 pl-8', text: platformBusiness.value.nonComplianceEmailOptional }]
          : []),
        {
          icon: 'i-mdi-at',
          label: t('strr.label.takedownEmail'),
          text: platformBusiness.value.takeDownEmail
        },
        ...(platformBusiness.value.takeDownEmailOptional
          ? [{ class: '-mt-2 pl-8', text: platformBusiness.value.takeDownEmailOptional }]
          : [])
      ]
    })
    // set sidebar accordian reps
    representatives.value = getDashboardRepresentives()
    // set side bar completing party
    completingParty.value = getDashboardCompParty()
    // update breadcrumbs with platform business name
    setBreadcrumbs([
      {
        label: t('label.bcregDash'),
        to: config.registryHomeURL + 'dashboard',
        appendAccountId: true,
        external: true
      },
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
  {
    label: t('label.bcregDash'),
    to: config.registryHomeURL + 'dashboard',
    appendAccountId: true,
    external: true
  },
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
          <div v-if="showPermitDetails">
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
    <div class="space-y-10 sm:w-[300px]">
      <ConnectDashboardSection :title="$t('word.addresses')" :loading="loading">
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
        <div v-else class="bg-white p-5 opacity-50">
          <p class="text-sm">
            {{ $t('text.completeFilingToDisplay') }}
          </p>
        </div>
      </ConnectDashboardSection>
      <ConnectDashboardSection :title="$t('label.completingParty')" :loading="loading">
        <ConnectAccordion v-if="showPermitDetails && completingParty" :items="[completingParty]" />
        <div v-else-if="!showPermitDetails" class="bg-white p-5 opacity-50">
          <p class="text-sm">
            {{ $t('text.completeFilingToDisplay') }}
          </p>
        </div>
      </ConnectDashboardSection>
    </div>
  </div>
</template>
