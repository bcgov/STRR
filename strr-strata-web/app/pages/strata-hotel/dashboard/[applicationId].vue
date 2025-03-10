<script setup lang="ts">
import Button from '~/components/document/upload/Button.vue'
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
const documentStore = useDocumentStore()

const todos = ref<Todo[]>([])
const buildings = ref<ConnectAccordionItem[]>([])
const representatives = ref<ConnectAccordionItem[]>([])
const completingParty = ref<ConnectAccordionItem | undefined>(undefined)

const isFileUploadOpen = ref(false)

onMounted(async () => {
  loading.value = true
  const applicationId = route.params.applicationId as string
  await loadStrata(applicationId)
  // set header stuff
  todos.value = getTodoApplication(
    '/strata-hotel/application',
    '/strata-hotel/dashboard/' + application.value?.header.applicationNumber,
    application.value?.header
  )
  if (!permitDetails.value || !showPermitDetails.value) {
    // TODO: probably not ever going to get here? Filing would launch from the other account dashboard?
    title.value = t('strr.title.dashboard')
  } else {
    // existing registration or application under the account
    // set left side of header
    title.value = strataDetails.value.brand.name
    const nonPlural = strataDetails.value.numberOfUnits === 1
    const urlParts = strataDetails.value.brand.website.match(/^(https?:\/\/)(www\.)?(.+?(?=(\/)|$))/)
    subtitles.value = [
      { text: t(`strataHotelCategoryReview.${strataDetails.value.category}`) },
      { text: `${strataDetails.value.numberOfUnits} ${t('strr.word.unit', nonPlural ? 1 : 2)}` },
      {
        text: urlParts && urlParts.length > 2 ? urlParts[3] || '' : '',
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
        registration.value.status,
        dateToStringPacific(registration.value.expiryDate, 'DDD'),
        downloadApplicationReceipt)
    }
    // strata side details
    setSideHeaderDetails(
      registration.value,
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
  middleware: ['auth', 'check-tos', 'require-account'],
  onAccountChange: async () => {
    const { $router, $i18n } = useNuxtApp()
    await $router.push(`/${$i18n.locale.value}/strata-hotel/dashboard`)
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
      <ConnectDashboardSection
        id="supporting-documents"
        :title="$t('label.supportingDocs')"
        :loading="loading"
      >
        <div class="flex justify-between p-3">
          <div
            id="support-document-list"
            class="space-y-1"
          >
            <div v-if="!documentStore.storedDocuments.length">
              <p>{{ $t('text.noDocsUploaded') }}</p>
            </div>
            <div
              v-for="doc in documentStore.storedDocuments"
              :key="doc.id"
              class="flex w-full items-center gap-1"
            >
              <UIcon
                name="i-mdi-paperclip"
                class="size-5 shrink-0 text-blue-500"
              />
              <div class="flex gap-1">
                <!-- TODO: can we leave out the name since there is only 1 document type? -->
                <!-- <span class="text-sm font-bold">{{ $t(`docType.${doc.type}`) }}</span> -->
                <span>{{ doc.name }}</span>
                <UBadge
                  v-if="doc.uploadStep === DocumentUploadStep.NOC"
                  :label="`${ t('strr.label.added')} ` + doc.uploadDate"
                  size="sm"
                  class="ml-1 px-3 py-0 font-bold"
                />
              </div>
            </div>
          </div>

          <div
            v-if="application?.header.status === ApplicationStatus.NOC_PENDING"
          >
            <UButton
              :label="t('btn.addNewDocuments')"
              icon="mdi-plus"
              :disabled="isFileUploadOpen"
              @click="isFileUploadOpen = true"
            />
          </div>
        </div>
        <BaseUploadAdditionalDocuments
          v-if="isFileUploadOpen"
          :component="Button"
          is-strata
          :application-number="application!.header.applicationNumber"
          :selected-doc-type="documentStore.selectedDocType"
          class="p-3"
          @upload-document="documentStore.addDocumentToApplication"
          @reset-doc-type="documentStore.selectedDocType = undefined"
          @close-upload="isFileUploadOpen = false"
        />
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
