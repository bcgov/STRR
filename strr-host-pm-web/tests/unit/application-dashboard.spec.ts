import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { DateTime } from 'luxon'
import { baseEnI18n } from '../mocks/i18n'
import { mockApplication, mockHostOwner, mockHostRegistration } from '../mocks/mockedData'
import ApplicationDashboard from '~/pages/dashboard/[applicationId].vue'
import {
  ConnectDashboardSection, Todo, TodoEmpty, SummaryProperty,
  SummarySupportingInfo, ConnectAccordion,
  UBadge,
  BaseUploadAdditionalDocuments,
  UButton
} from '#components'

vi.mock('@/stores/hostPermit', () => ({
  useHostPermitStore: () => ({
    loadHostData: vi.fn(),
    downloadApplicationReceipt: vi.fn(),
    permitDetails: ref({
      unitAddress: mockApplication.registration.unitAddress,
      documents: [],
      primaryContact: mockApplication.registration.primaryContact
    }),
    isPaidApplication: ref(false),
    showPermitDetails: ref(true),
    application: ref(mockApplication),
    registration: ref(mockApplication.registration),
    needsBusinessLicenseDocumentUpload: ref(false)
  })
}))

vi.mock('@/composables/useFeatureFlags', () => ({
  useFeatureFlags: () => ({
    isFeatureEnabled: vi.fn().mockReturnValue(ref(false))
  })
}))

vi.mock('@/stores/document', () => ({
  useDocumentStore: () => ({
    requiredDocs: ref([]),
    storedDocuments: ref(mockApplication.registration.documents)
  })
}))

vi.mock('@/stores/connectDetailsHeader', () => ({
  useConnectDetailsHeaderStore: () => ({
    loading: ref(false),
    title: ref(''),
    subtitles: ref([])
  })
}))

vi.mock('@/stores/hostProperty', () => ({
  useHostPropertyStore: () => ({
    unitAddress: ref({ address: mockApplication.registration.unitAddress }),
    unitDetails: ref(mockApplication.registration.unitDetails),
    blInfo: ref({
      businessLicense: '12345',
      businessLicenseExpiryDate: '2025-01-01'
    })
  })
}))

vi.mock('@/composables/useRenewals', () => ({
  useRenewals: () => ({
    isEligibleForRenewal: ref(true),
    renewalDueDate: computed(() =>
      DateTime.fromISO(mockHostRegistration.expiryDate).setZone('America/Vancouver').toLocaleString(DateTime.DATE_MED)),
    renewalDateCounter: computed(() => 20),
    isRenewalPeriodClosed: ref(false),
    isRenewalsEnabled: ref(true)
    // getRegistrationRenewalTodos: vi.fn()
  })
}))

mockNuxtImport('useConnectLaunchdarklyStore', () => {
  return () => ({
    getStoredFlag: vi.fn().mockReturnValue(true)
  })
})

vi.mock('@/composables/useStrrApi', () => ({
  useStrrApi: () => ({
    getRegistrationToDos: vi.fn().mockReturnValue({
      todos: [{
        task: { type: 'REGISTRATION_RENEWALS' }
      }]
    })
  })
}))

describe('Dashboard Application Page', () => {
  let wrapper: any

  beforeAll(async () => {
    wrapper = await mountSuspended(ApplicationDashboard, {
      global: { plugins: [baseEnI18n] }
    })
  })

  it('renders the dashboard page', () => {
    expect(wrapper.find('[data-test-id="host-dashboard-page"]').exists()).toBe(true)
  })

  it('renders all dashboard sections', () => {
    const sections = [
      'todo-section',
      'rental-section',
      'supporting-info-section',
      'individuals-business-section'
    ]

    sections.forEach((section) => {
      expect(wrapper.find(`[data-test-id="${section}"]`).exists()).toBe(true)
    })
  })

  it('renders summary components', () => {
    const summaryComponents = [
      'summary-property',
      'summary-supporting-info'
    ]

    summaryComponents.forEach((component) => {
      expect(wrapper.find(`[data-test-id="${component}"]`).exists()).toBe(true)
    })
  })

  it('renders all components', () => {
    const components = [
      { component: ConnectDashboardSection, testId: 'connect-dashboard-section' },
      { component: SummaryProperty, testId: 'summary-property' },
      { component: SummarySupportingInfo, testId: 'summary-supporting-info' },
      { component: ConnectAccordion, testId: 'owners-accordion' }
    ]

    components.forEach(({ component }) => {
      expect(wrapper.findComponent(component).exists()).toBe(true)
    })

    // should not render Add Documents button for NOC
    expect(wrapper.find('[data-test-id="add-noc-doc-btn"]').exists()).toBe(false)
  })

  it('renders todo components based on store state', async () => {
    mockApplication.header = {
      ...mockApplication.header,
      applicationNumber: 'ABC123',
      status: ApplicationStatus.DRAFT,
      hostActions: []
    }
    wrapper = await mountSuspended(ApplicationDashboard, {
      global: { plugins: [baseEnI18n] }
    })
    await wrapper.vm.$forceUpdate()
    expect(wrapper.findComponent(TodoEmpty).exists()).toBe(false)
    expect(wrapper.findComponent(Todo).exists()).toBe(true)
    expect(wrapper.find('[data-test-id="todo-section"]').find('[data-test-id="todo-resume-app"]').exists()).toBe(true)
  })

  it('renders dashboard with additional documents upload for NOC', async () => {
    mockApplication.header = {
      ...mockApplication.header,
      applicationNumber: 'ABC123',
      status: ApplicationStatus.NOC_PENDING,
      hostActions: [],
      nocEndDate: new Date('2025-01-01')
    }
    wrapper = await mountSuspended(ApplicationDashboard, {
      global: { plugins: [baseEnI18n] }
    })
    await wrapper.vm.$forceUpdate()

    expect(wrapper.findComponent(TodoEmpty).exists()).toBe(false)
    expect(wrapper.findComponent(Todo).exists()).toBe(true)
    expect(wrapper.find('[data-test-id="todo-section"]').find('[data-test-id="todo-noc-add-docs"]').exists()).toBe(true)

    const AddNewDocButton = '[data-test-id="add-noc-doc-btn"]'
    expect(wrapper.find(AddNewDocButton).exists()).toBe(true)
    expect(wrapper.find(AddNewDocButton).attributes().disabled).not.toBeDefined()
    expect(wrapper.findComponent(BaseUploadAdditionalDocuments).exists()).toBe(false) // button is not disabled

    // click Add New Document button to open Upload Additional Document
    wrapper.find(AddNewDocButton).trigger('click')
    await nextTick()

    expect(wrapper.findComponent(BaseUploadAdditionalDocuments).exists()).toBe(true)
    expect(wrapper.find(AddNewDocButton).attributes().disabled).toBeDefined() // button is disabled

    const documentsList = wrapper.find('#stored-documents-list')
    expect(documentsList.findAll('[data-test-id="stored-document"]').length).toBe(2)
    expect(documentsList.findAllComponents(UBadge).length).toBe(0) // date badges in list should not show

    // doc to upload with NOC uploadStep
    const document: UiDocument = {
      file: new File([], ''),
      apiDoc: {} as ApiDocument,
      name: 'test',
      type: DocumentUploadType.BCSC,
      id: '123123',
      loading: false,
      uploadStep: DocumentUploadStep.NOC,
      uploadDate: new Date().toISOString().split('T')[0]
    }

    // update stored documents as if user uploaded an additional document
    const { storedDocuments } = storeToRefs(useDocumentStore())
    storedDocuments.value.push(document)
    await nextTick()

    expect(documentsList.findAll('[data-test-id="stored-document"]').length).toBe(3) // should show additional doc
    expect(documentsList.findAllComponents(UBadge).length).toBe(1) // should show date badge for NOC doc
  })

  // TODO: run this test after base-app changes (v0.0.36) are merged in
  it.skip('renders dashboard with Renewal To Do', () => {
    const toDoSection = wrapper.find('[data-test-id="todo-section"]')
    expect(toDoSection.findComponent(TodoEmpty).exists()).toBe(false)

    const renewalToDo = toDoSection.find('[data-test-id="todo-renew-registration"]')
    expect(renewalToDo.exists()).toBe(true)

    expect(renewalToDo.findComponent(UButton).exists()).toBe(true)
    expect(renewalToDo.find('H3').text()).toContain('Registration Renewal')
    expect(renewalToDo.find('H3').text()).toContain('Dec 31, 2025') // renewalDueDate from mock
    expect(renewalToDo.find('H3').text()).toContain('in 20 days') // renewalDateCounter from mock
  })

  it('renders dashboard with No CRA Tax Number', () => {
    vi.mock('@/stores/hostOwner', () => ({
      useHostOwnerStore: () => ({
        validateOwners: () => true,
        hostOwners: [{
          ...mockHostOwner,
          taxNumber: '' // no tax number owner
        }]
      })
    }))

    const individualAndBusinessInfo = wrapper.find('[data-test-id="individuals-business-section"]')
    expect(individualAndBusinessInfo.exists()).toBe(true)
    expect(individualAndBusinessInfo.text()).toContain(mockHostOwner.dateOfBirth)
    expect(individualAndBusinessInfo.text()).toContain(mockHostOwner.emailAddress)
    // have to assert against the content as there is no other means to unit test it
    expect(individualAndBusinessInfo.text()).toContain('No CRA Tax Number')
  })

  it('renders dashboard with Terms and Conditions', async () => {
    mockApplication.registration = mockHostRegistration

    wrapper = await mountSuspended(ApplicationDashboard, {
      global: { plugins: [baseEnI18n] }
    })

    await wrapper.vm.$forceUpdate()

    const termsConditionsSections = wrapper.find('[data-test-id="reg-terms-conditions"]')
    expect(termsConditionsSections.exists()).toBe(true)

    const statusBadge = termsConditionsSections.find('[data-test-id="reg-status-badge"]')
    expect(statusBadge.exists()).toBe(true)
    expect(statusBadge.text()).toBe('ACTIVE')

    const predefinedTerms = termsConditionsSections.find('[data-test-id="terms-conditions-predefined"]')
    expect(predefinedTerms.exists()).toBe(true)
    expect(predefinedTerms.findAll('li').length).toBe(3)

    const customTerms = termsConditionsSections.find('[data-test-id="terms-conditions-custom"]')
    expect(customTerms.exists()).toBe(true)
    expect(customTerms.findAll('li').length).toBe(1)

    const alwaysShownTerms = termsConditionsSections.find('[data-test-id="terms-always-shown"]')
    expect(alwaysShownTerms.exists()).toBe(true)
    expect(alwaysShownTerms.findAll('li').length).toBe(1)
  })
})
