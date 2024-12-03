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
const permitStore = useHostPermitStore()
const {
  application,
  registration,
  permitDetails,
  isPaidApplication,
  showPermitDetails
} = storeToRefs(permitStore)
const { unitAddress, unitDetails } = storeToRefs(useHostPropertyStore())

const todos = ref<Todo[]>([])
const property = ref<ConnectAccordionItem[]>([])
const owners = ref<ConnectAccordionItem[]>([])

onMounted(async () => {
  loading.value = true
  const applicationId = route.params.applicationId as string
  await permitStore.loadHostData(applicationId)
  // set header stuff
  if (!permitDetails.value || !showPermitDetails.value) {
    // TODO: probably not ever going to get here? Filing would launch from the other account dashboard?
    title.value = t('strr.title.dashboard')
    todos.value = [getTodoApplication('/application', application.value?.header)]
  } else {
    // existing registration or application under the account
    // set left side of header
    const defaultName = `${permitDetails.value.unitAddress.streetNumber} ${permitDetails.value.unitAddress.streetName}`
    title.value = permitDetails.value.unitAddress.nickname || defaultName

    const rooms = unitDetails.value.numberOfRoomsForRent
    subtitles.value = [
      {
        text: t(`propertyType.${unitDetails.value.propertyType}`)
      },
      ...(rooms !== undefined
        ? [{ text: `${rooms} ${t('strr.label.room', rooms)}` }]
        : []
      )
    ]
    if (!registration.value) {
      setHeaderDetails(
        application.value?.header.hostStatus,
        undefined,
        isPaidApplication.value ? permitStore.downloadApplicationReceipt : undefined)
    } else {
      setHeaderDetails(
        registration.value.status,
        dateToStringPacific(registration.value.expiryDate, 'DDD'),
        permitStore.downloadApplicationReceipt)
    }
    // host side details
    setSideHeaderDetails(registration.value, application.value?.header)
    setHostSideHeaderDetails()
    // set sidebar accordian property
    property.value = [{
      defaultOpen: true,
      showAvatar: false,
      label: t('label.property'),
      values: [
        {
          icon: 'i-mdi-home-circle-outline',
          iconClass: '-mt-1 size-8',
          address: unitAddress.value.address
        }
      ]
    }, {
      defaultOpen: false,
      showAvatar: false,
      label: t('label.details'),
      // TODO: needs design decisions
      values: [
        {
          text: 'Property type?',
          class: 'italic'
        },
        {
          text: 'Type of space?',
          class: 'italic'
        },
        {
          text: 'Ownership type?',
          class: 'italic'
        }
      ]
    }]
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
      { label: permitDetails.value.unitAddress.nickname || defaultName }
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
  { label: t('strr.title.dashboard'), to: localePath('/dashboard') },
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
    <div class="space-y-10 sm:w-[300px]">
      <ConnectDashboardSection :title="$t('strr.label.rentalUnit', 1)" :loading="loading">
        <ConnectAccordion v-if="showPermitDetails" :items="property" />
        <div v-else class="bg-white p-5 opacity-50">
          <p class="text-sm">
            {{ $t('text.completeFilingToDisplay') }}
          </p>
        </div>
      </ConnectDashboardSection>
      <ConnectDashboardSection :title="$t('strr.label.individualsBusinesses')" :loading="loading">
        <ConnectAccordion v-if="showPermitDetails" :items="owners" multiple />
        <div v-else class="w-full bg-white p-5 opacity-50">
          <p class="text-sm">
            {{ $t('text.completeFilingToDisplay') }}
          </p>
        </div>
      </ConnectDashboardSection>
    </div>
  </div>
</template>
