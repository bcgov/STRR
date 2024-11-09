import { mountSuspended } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import ApplicationDetails from '@/pages/application-details/[id]/index.vue'
import {
  mockApplicationApproved,
  mockApplicationPaymentDue,
  mockApplicationApprovedWithSecondaryContact,
  mockApplicationApprovedWithDocuments
} from '~/tests/mocks/mockApplication'

const { t } = useTranslation()
const tApplicationDetails = (key: string) => t(`applicationDetails.${key}`)
const tStatuses = (key: string) => t(`statuses.${key}`)

vi.mock('~/composables/useApplications', () => ({
  useApplications: vi.fn()
}))

const mockUseApplications = (applicationData: any = mockApplicationApproved) => {
  // @ts-ignore: Ignore TypeScript error for mockImplementation
  useApplications.mockImplementation(() => ({
    getApplication: vi.fn().mockResolvedValue(applicationData),
    getApplicationHistory: vi.fn().mockResolvedValue([])
  }))
}

vi.mock('@/stores/keycloak', () => ({
  useBcrosKeycloak: vi.fn()
}))

const mockUseBcrosKeycloak = (isExaminer: boolean = false) => {
  // @ts-ignore: Ignore TypeScript error for mockImplementation
  useBcrosKeycloak.mockImplementation(() => ({
    isExaminer: ref(isExaminer)
  }))
}

vi.mock('~/composables/useChipFlavour', () => ({
  useChipFlavour: () => ({
    getChipFlavour: () => ({
      text: 'success',
      color: 'bg-green-100'
    })
  })
}))

describe('Application Details Page', () => {
  let wrapper: any

  beforeEach(() => {
    vi.resetAllMocks()
    mockUseApplications()
    mockUseBcrosKeycloak()
  })

  it('renders the application details page correctly', async () => {
    wrapper = await mountSuspended(ApplicationDetails)
    expect(wrapper.findTestId('application-details').exists()).toBe(true)
    expect(wrapper.findTestId('application-header').exists()).toBe(true)
    expect(wrapper.findTestId('application-title').exists()).toBe(true)
  })

  it('displays application status correctly', async () => {
    wrapper = await mountSuspended(ApplicationDetails)
    const statusSection = wrapper.findTestId('application-status')
    expect(statusSection.exists()).toBe(true)
    expect(statusSection.find('h2').text()).toBe(tApplicationDetails('applicationStatus'))
  })

  it('displays rental unit information correctly', async () => {
    wrapper = await mountSuspended(ApplicationDetails)
    expect(wrapper.findTestId('unit-nickname').exists()).toBe(true)
    expect(wrapper.findTestId('ownership-type').exists()).toBe(true)
    expect(wrapper.findTestId('unit-address').exists()).toBe(true)
    expect(wrapper.findTestId('parcel-identifier').exists()).toBe(true)
    expect(wrapper.findTestId('property-type').exists()).toBe(true)
    const statusText = wrapper.findTestId('application-status-text')
    expect(statusText.text()).toBe(tStatuses('hostStatuses.fullReviewApproved'))
  })

  it('displays primary contact information correctly', async () => {
    wrapper = await mountSuspended(ApplicationDetails)
    const primaryContact = wrapper.findTestId('primary-contact')
    expect(primaryContact.exists()).toBe(true)
    expect(wrapper.findTestId('primary-contact-name').exists()).toBe(true)
    expect(wrapper.findTestId('primary-contact-email').exists()).toBe(true)
    expect(wrapper.findTestId('primary-contact-phone').exists()).toBe(true)
    expect(wrapper.findTestId('primary-contact-address').exists()).toBe(true)
  })

  it('displays payment due banner when payment is due', async () => {
    mockUseApplications(mockApplicationPaymentDue)

    wrapper = await mountSuspended(ApplicationDetails)
    const statusText = wrapper.findTestId('application-status-text')
    expect(statusText.text()).toBe(tStatuses('paymentDue'))
    const banner = wrapper.findTestId('payment-due-banner')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain(tApplicationDetails('paymentDueBannerTitle'))
  })

  it('displays documents section when documents exist', async () => {
    mockUseApplications(mockApplicationApprovedWithDocuments)

    wrapper = await mountSuspended(ApplicationDetails)
    const documentId = wrapper.vm.documents[0].fileKey
    const documents = wrapper.findTestId(`document-${documentId}`)
    expect(documents.exists()).toBe(true)
    const documentsSection = wrapper.findTestId('documents-section')
    expect(documentsSection.exists()).toBe(true)
  })

  it('displays examiner-specific sections when user is examiner', async () => {
    mockUseBcrosKeycloak(true)

    wrapper = await mountSuspended(ApplicationDetails)
    expect(wrapper.findTestId('ltsa-info-section').exists()).toBe(true)
    expect(wrapper.findTestId('auto-approval-section').exists()).toBe(true)
  })

  it('displays secondary contact information when available', async () => {
    mockUseApplications(mockApplicationApprovedWithSecondaryContact)

    wrapper = await mountSuspended(ApplicationDetails)
    const secondaryContact = wrapper.findTestId('secondary-contact')
    expect(secondaryContact.exists()).toBe(true)
    expect(wrapper.findTestId('secondary-contact-email').text()).toContain('secondary@email.com')
  })
})
