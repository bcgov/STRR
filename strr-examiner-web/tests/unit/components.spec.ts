import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, vi, expect } from 'vitest'
import filter from 'lodash/filter'
import { enI18n } from '../mocks/i18n'
import {
  mockDocuments, mockDocumentsNOC, mockApplicationFilingHistory,
  mockHostApplication, mockRegistrationFilingHistory
} from '../mocks/mockedData'
import SupportingDocuments from '~/components/SupportingDocuments.vue'
import { HostExpansionFilingHistory, UBadge, UButton } from '#components'

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => ({
    isApplication: ref(true),
    activeReg: ref(mockHostApplication.registration),
    activeHeader: ref(mockHostApplication.header),
    activeRecord: ref(mockHostApplication),
    getApplicationFilingHistory: vi.fn().mockResolvedValue(mockApplicationFilingHistory),
    getRegistrationFilingHistory: vi.fn().mockResolvedValue(mockRegistrationFilingHistory),
    isFilingHistoryOpen: ref(true)
  })
}))

describe('FilingHistory Component', async () => {
  const filingHistoryWrapper = await mountSuspended(HostExpansionFilingHistory, {
    global: { plugins: [enI18n] }
  })

  it('should display Filing History table', () => {
    expect(filingHistoryWrapper.exists()).toBe(true)

    const historyTableRows = filingHistoryWrapper.find('[data-testid="history-table"]').findAll('tbody tr')
    expect(historyTableRows.length).toBe(3) // only 3 events because AUTO_APPROVAL_FULL_REVIEW is hidden by the requirement

    // events should be in reverse order
    expect(historyTableRows.at(0)?.text()).toContain(mockApplicationFilingHistory.at(3)?.message)
    expect(historyTableRows.at(0)?.text()).toContain(mockApplicationFilingHistory.at(3)?.idir)
    expect(historyTableRows.at(1)?.text()).toContain(mockApplicationFilingHistory.at(1)?.message)
    expect(historyTableRows.at(2)?.text()).toContain(mockApplicationFilingHistory.at(0)?.message)
    expect(filingHistoryWrapper.findAll('[data-testid="filing-history-idir"]').length).toBe(1)
  })
})

describe('SupportingDocuments Component', () => {
  // setup documents for tests
  const allMocDocuments = [...mockDocuments, ...mockDocumentsNOC]
  mockHostApplication.registration.documents = allMocDocuments

  // create SupportingDocuments component with a specified config
  const mountComponent = async (config: SupportingDocumentsConfig) => {
    return await mountSuspended(SupportingDocuments, {
      global: { plugins: [enI18n] },
      props: { config }
    })
  }

  // Supporting Documents Configs to help with testing

  const NO_CONFIG = {} // show all documents, exclude badges

  const ALL_DOCS_NOC_BADGES: SupportingDocumentsConfig = { // all documents with all date badges for NOC upload step
    includeDateBadge: [DocumentUploadStep.NOC]
  }

  const BUSINESS_LIC_DOCS: SupportingDocumentsConfig = { // only BL docs during initial application submission
    includeTypes: [DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE],
    excludeUploadStep: [DocumentUploadStep.NOC]
  }

  const BUSINESS_LIC_NOC_DOCS: SupportingDocumentsConfig = { // only BL docs during NOC Pending
    includeTypes: [DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE],
    includeUploadStep: [DocumentUploadStep.NOC]
  }

  const INITIAL_APP_DOCS: SupportingDocumentsConfig = { // only docs during initial application submission, exclude NOC
    excludeUploadStep: [DocumentUploadStep.NOC]
  }

  const NOC_APP_DOCS: SupportingDocumentsConfig = { // only docs during initial application submission, exclude NOC
    includeUploadStep: [DocumentUploadStep.NOC],
    includeDateBadge: [DocumentUploadStep.NOC]
  }

  it('should display all documents without date badges', async () => {
    const supportingDocuments = await mountComponent(NO_CONFIG)

    expect(supportingDocuments.exists()).toBe(true)
    expect(supportingDocuments.findAllComponents(UButton).length).toBe(allMocDocuments.length)
    expect(supportingDocuments.findAllComponents(UBadge).length).toBe(0) // no badges because of empty config
  })

  it('should display all documents with date badges for NOC documents', async () => {
    const supportingDocuments = await mountComponent(ALL_DOCS_NOC_BADGES)

    const filteredDocsCount = filter(allMocDocuments, {
      uploadStep: DocumentUploadStep.NOC
    }).length

    expect(supportingDocuments.exists()).toBe(true)
    expect(supportingDocuments.findAllComponents(UButton).length).toBe(allMocDocuments.length)
    expect(supportingDocuments.findAllComponents(UBadge).length).toBe(filteredDocsCount)
  })

  it('should display only Business Lic documents', async () => {
    const supportingDocuments = await mountComponent(BUSINESS_LIC_DOCS)

    const filteredDocsCount = filter(allMocDocuments, {
      documentType: DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE
    }).length

    expect(supportingDocuments.exists()).toBe(true)
    expect(supportingDocuments.findAllComponents(UButton).length).toBe(filteredDocsCount)
    expect(supportingDocuments.findAllComponents(UBadge).length).toBe(0)
  })

  it('should display only Business Lic documents during NOC', async () => {
    const supportingDocuments = await mountComponent(BUSINESS_LIC_NOC_DOCS)

    const filteredDocsCount = filter(allMocDocuments, {
      documentType: DocumentUploadType.LOCAL_GOVT_BUSINESS_LICENSE,
      uploadStep: DocumentUploadStep.NOC
    }).length

    expect(supportingDocuments.exists()).toBe(true)
    expect(supportingDocuments.findAllComponents(UButton).length).toBe(filteredDocsCount)
    expect(supportingDocuments.findAllComponents(UBadge).length).toBe(0)
  })

  it('should display all documents during initial application submission (exclude NOC)', async () => {
    const supportingDocuments = await mountComponent(INITIAL_APP_DOCS)

    const filteredDocsCount = allMocDocuments.length - filter(allMocDocuments, {
      uploadStep: DocumentUploadStep.NOC
    }).length

    expect(supportingDocuments.exists()).toBe(true)
    expect(supportingDocuments.findAllComponents(UButton).length).toBe(filteredDocsCount)
    expect(supportingDocuments.findAllComponents(UBadge).length).toBe(0)
  })

  it('should display all docs uploaded during NOC Pending status', async () => {
    const supportingDocuments = await mountComponent(NOC_APP_DOCS)

    const filteredDocsCount = filter(allMocDocuments, {
      uploadStep: DocumentUploadStep.NOC
    }).length

    expect(supportingDocuments.exists()).toBe(true)
    expect(supportingDocuments.findAllComponents(UButton).length).toBe(filteredDocsCount)
    expect(supportingDocuments.findAllComponents(UBadge).length).toBe(3)
  })
})
