import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockStrataDetailsStore,
  mockContactStore,
  mockStrataApplicationStore,
  mockStrataBusinessStore,
  mockStoredDocument
} from '../mocks/mockedData'
import ReviewConfirm from '~/components/form/ReviewConfirm.vue'

const mockValidateContact = vi.fn().mockResolvedValue([])
const mockValidateStrataBusiness = vi.fn().mockReturnValue([])
const mockValidateStrataDetails = vi.fn().mockReturnValue([])
const mockValidateDocuments = vi.fn().mockReturnValue([])

let mockStoredDocumentsList: any[] = []
let mockStrataDetailsState = mockStrataDetailsStore.strataDetails

mockNuxtImport('useStrrContactStore', () => () => ({
  completingParty: mockContactStore.completingParty,
  validateContact: mockValidateContact
}))

vi.mock('@/stores/strataBusiness', () => ({
  useStrrStrataBusinessStore: () => ({
    strataBusiness: mockStrataBusinessStore.strataBusiness,
    validateStrataBusiness: mockValidateStrataBusiness
  })
}))

vi.mock('@/stores/strataDetails', () => ({
  useStrrStrataDetailsStore: () => ({
    strataDetails: mockStrataDetailsState,
    validateStrataDetails: mockValidateStrataDetails
  })
}))

vi.mock('@/stores/document', () => ({
  useDocumentStore: () => ({
    storedDocuments: mockStoredDocumentsList,
    validateDocuments: mockValidateDocuments
  })
}))

vi.mock('@/stores/strataApplication', () => ({
  useStrrStrataApplicationStore: () => ({
    confirmation: mockStrataApplicationStore.confirmation
  })
}))

const mountComponent = () =>
  mountSuspended(ReviewConfirm, { props: { isComplete: false } })

describe('ReviewConfirm component', () => {
  beforeEach(() => {
    mockStoredDocumentsList = []
    mockStrataDetailsState = mockStrataDetailsStore.strataDetails
    vi.clearAllMocks()
  })

  it('render the review section root element', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.find('[data-testid="strata-review-confirm"]').exists()).toBe(true)
  })

  it('show no document items when document store is empty', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.findAll('[data-testid="document-item"]')).toHaveLength(0)
  })

  it('render uploaded document filenames', async () => {
    mockStoredDocumentsList = [mockStoredDocument]
    const wrapper = await mountComponent()
    expect(wrapper.text()).toContain('strata-permit.pdf')
  })

  it('should not show the unit listing link when no unit listings are set', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.find('[data-testid="unit-listing-link"]').exists()).toBe(false)
  })

  it('should show the unit listing link when primary unit listings are present', async () => {
    mockStrataDetailsState = {
      ...mockStrataDetailsStore.strataDetails,
      unitListings: { primary: 'Suite 101\nSuite 102', additional: [] }
    }
    const wrapper = await mountComponent()
    expect(wrapper.find('[data-testid="unit-listing-link"]').exists()).toBe(true)
  })
})
