import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { baseEnI18n } from '../mocks/i18n'
import { mockApplication } from '../mocks/mockedData'
import ApplicationDashboard from '~/pages/dashboard/[applicationId].vue'
import {
  ConnectDashboardSection, Todo, TodoEmpty, SummaryProperty,
  SummarySupportingInfo, ConnectAccordion,
  UBadge
} from '#components'

import BaseUploadAdditionalDocuments from '#baseWeb/components/BaseUploadAdditionalDocuments.vue'

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
    registration: ref(mockApplication.registration)
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
  })

  it('renders dashboard with additional documents upload for NOC', async () => {
    mockApplication.header = {
      ...mockApplication.header,
      applicationNumber: 'ABC123',
      status: ApplicationStatus.NOC_PENDING,
      hostActions: []
    }
    wrapper = await mountSuspended(ApplicationDashboard, {
      global: { plugins: [baseEnI18n] }
    })
    await wrapper.vm.$forceUpdate()

    const AddNewDocButton = '[data-test-id="add-noc-doc-btn"]'
    expect(wrapper.find(AddNewDocButton).exists()).toBe(true)
    expect(wrapper.find(AddNewDocButton).attributes().disabled).not.toBeDefined()
    expect(wrapper.findComponent(BaseUploadAdditionalDocuments).exists()).toBe(false) // button is not disabled

    // cleck Add New Document button to open Upload Additional Document
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
})
