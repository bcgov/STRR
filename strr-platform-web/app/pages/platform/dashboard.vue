<script setup lang="ts">
const localePath = useLocalePath()

const { t } = useI18n()
const config = useRuntimeConfig().public
const ldStore = useConnectLaunchdarklyStore()

const { loading, title, subtitles } = storeToRefs(useConnectDetailsHeaderStore())
const { downloadApplicationReceipt, loadPlatform } = useStrrPlatformStore()
const {
  application,
  registration,
  permitDetails,
  isPaidApplication,
  showPermitDetails,
  renewalRegId
} = storeToRefs(useStrrPlatformStore())
const { platformBusiness } = storeToRefs(useStrrPlatformBusiness())
const { platformDetails } = storeToRefs(useStrrPlatformDetails())
const { deleteApplication } = useStrrApi()

const todos = ref<Todo[]>([])
const addresses = ref<ConnectAccordionItem[]>([])
const representatives = ref<ConnectAccordionItem[]>([])
const completingParty = ref<ConnectAccordionItem | undefined>(undefined)
const isRenewalsEnabled: boolean = ldStore.getStoredFlag('enable-platform-registration-renewals')
const hasPermitDetails = computed(() => Boolean(permitDetails.value && showPermitDetails.value))

const getApplicationTodo = () => {
  return getTodoApplication(
    '/platform/application',
    '/platform/dashboard/' + application.value?.header.applicationNumber,
    application.value?.header
  )
}

const getRenewalToDo = async (): Promise<Todo[]> => {
  if (!registration.value || !isRenewalsEnabled) { return [] }

  const { hasRenewalTodo, hasRenewalDraft, renewalDraftId } = await getTodoRegistration(registration.value.id)

  if (!hasRenewalTodo && !hasRenewalDraft) { return [] }

  const renewalTodos: Todo[] = []

  if (hasRenewalTodo) {
    const { isOverdue, renewalDueDate, countdownLabel } = getTodoRenewalInfo(registration.value!.expiryDate)

    renewalTodos.push({
      id: 'todo-renew-platform',
      title: `${t('todos.renewal.title1')} ${renewalDueDate} ${t('todos.renewal.title2')} (${countdownLabel})`,
      subtitle: t(isOverdue
        ? 'todos.renewal.expired'
        : 'todos.renewal.expiresSoon', translateOptions),
      buttons: [{
        label: t('btn.renew'),
        action: async () => {
          renewalRegId.value = registration.value?.id.toString()
          await navigateTo({
            path: localePath('/platform/application'),
            query: { override: 'true', renew: 'true' }
          })
        }
      }]
    })
  }

  if (hasRenewalDraft) {
    renewalTodos.push({
      id: 'todo-renewal-draft',
      title: t('todos.renewalDraft.title'),
      subtitle: t('todos.renewalDraft.subtitle'),
      buttons: [
        {
          label: t('todos.renewalDraft.resumeButton'),
          action: async () => {
            await navigateTo({
              path: localePath('/platform/application'),
              query: { override: 'true', renew: 'true', applicationId: renewalDraftId }
            })
          }
        },
        {
          label: t('todos.renewalDraft.deleteDraft'),
          icon: 'i-mdi-delete',
          action: async () => {
            // delete draft application
            await deleteApplication(renewalDraftId)
            // remove renewal draft todo
            todos.value = todos.value.filter(todo => todo.id !== 'todo-renewal-draft')
            // reload registration renewal todos
            // getRenewalToDo()
            todos.value.push(...await getRenewalToDo())
          }
        }
      ]
    })
  }

  return renewalTodos
}

const setSidePanelDetails = () => {
  // set sidebar accordion addresses
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
        ? [{ class: '-mt-2 pl-9', text: platformBusiness.value.nonComplianceEmailOptional }]
        : []),
      {
        icon: 'i-mdi-at',
        label: t('strr.label.takedownEmail'),
        text: platformBusiness.value.takeDownEmail
      },
      ...(platformBusiness.value.takeDownEmailOptional
        ? [{ class: '-mt-2 pl-9', text: platformBusiness.value.takeDownEmailOptional }]
        : [])
    ]
  })
  // set sidebar accordion reps
  representatives.value = getDashboardRepresentatives()
  // set side bar completing party
  completingParty.value = getDashboardCompParty()
}

const setRegistrationHeaderDetails = () => {
  if (!registration.value) {
    setHeaderDetails(
      application.value?.header.hostStatus,
      undefined,
      isPaidApplication.value ? downloadApplicationReceipt : undefined)
  } else {
    setHeaderDetails(
      registration.value.status,
      dateToStringPacific(registration.value.expiryDate, 'DDD'),
      downloadApplicationReceipt)
  }
  // add common side details
  setSideHeaderDetails(registration.value, application.value?.header)
  // add platform specific side details
  setPlatformSideHeaderDetails()
}

onMounted(async () => {
  loading.value = true
  await loadPlatform()

  // add application todo
  todos.value.push(...getApplicationTodo())
  // add renewal todo
  todos.value.push(...await getRenewalToDo())

  if (hasPermitDetails.value) {
    // existing registration or application under the account
    // set left side of header
    title.value = platformBusiness.value.legalName
    subtitles.value = [
      ...(platformBusiness.value.homeJurisdiction
        ? [{ text: platformBusiness.value.homeJurisdiction }]
        : []
      ),
      { text: t(`strr.label.listingSize.${platformDetails.value.listingSize}`) }
    ]
    setRegistrationHeaderDetails()
    setSidePanelDetails()
    setBreadcrumbs([
      {
        label: t('label.bcregDash'),
        to: config.registryHomeURL + 'dashboard',
        appendAccountId: true,
        external: true
      },
      { label: platformBusiness.value.legalName }
    ])
  } else {
    // no registration or valid complete application under the account, set static header
    title.value = t('strr.title.dashboard')
  }
  loading.value = false
})

// page stuff
useHead({
  title: t('strr.title.dashboard')
})

definePageMeta({
  layout: 'connect-dashboard',
  middleware: ['auth', 'check-tos', 'require-premium-account'],
  onAccountChange: (oldAccount: Account, newAccount: Account) => manageAccountChangeDashboard(oldAccount, newAccount)
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
          :id="todo.id"
          :key="todo.title"
          :title="todo.title"
          :subtitle="todo.subtitle"
          :buttons="todo.buttons"
        />
      </ConnectDashboardSection>
      <ConnectDashboardSection
        :title="$t('strr.label.platformNames', platformDetails.brands.length)"
        :loading="loading"
      >
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
