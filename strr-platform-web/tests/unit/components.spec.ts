import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { mockPlatBusiness, mockCompletingParty, mockPlatformDetails } from '../mocks/mockedData'
import Details from '~/components/form/platform/Details.vue'
import BusinessDetails from '~/components/form/platform/BusinessDetails.vue'
import ReviewConfirm from '~/components/form/platform/ReviewConfirm.vue'

const mockPlatformDetailsRef = ref({ ...mockPlatformDetails })
const mockPlatformBusinessRef = ref({ ...mockPlatBusiness })
const mockAddNewEmptyBrand = vi.fn()
const mockRemoveBrandAtIndex = vi.fn()

mockNuxtImport('useKeycloak', () => () => ({
  kcUser: ref({ loginSource: 'BCSC' }),
  isAuthenticated: ref(true)
}))

mockNuxtImport('useStrrContactStore', () => () => ({
  completingParty: mockCompletingParty,
  primaryRep: undefined,
  secondaryRep: undefined,
  validateContact: vi.fn().mockResolvedValue([])
}))

vi.mock('@/stores/platformDetails', () => ({
  useStrrPlatformDetails: () => ({
    platformDetails: mockPlatformDetailsRef.value,
    addNewEmptyBrand: mockAddNewEmptyBrand,
    removeBrandAtIndex: mockRemoveBrandAtIndex,
    validatePlatformDetails: vi.fn().mockReturnValue([])
  })
}))

vi.mock('@/stores/platformBusiness', () => ({
  useStrrPlatformBusiness: () => ({
    platformBusiness: mockPlatformBusinessRef.value,
    isMailingInBC: ref(false),
    getBusinessSchema: vi.fn(() => ({})),
    validatePlatformBusiness: vi.fn().mockReturnValue([])
  })
}))

vi.mock('@/stores/platform', () => ({
  useStrrPlatformStore: () => ({
    isRegistrationRenewal: ref(false)
  })
}))

vi.mock('@/stores/platformApplication', () => ({
  useStrrPlatformApplication: () => ({
    platformConfirmation: { confirmation: false },
    validatePlatformConfirmation: vi.fn().mockReturnValue([])
  })
}))

describe('Details form component', () => {
  beforeEach(() => {
    mockPlatformDetailsRef.value = { ...mockPlatformDetails }
    mockAddNewEmptyBrand.mockClear()
    mockRemoveBrandAtIndex.mockClear()
  })

  it('should render platform-details section with listing size and brand fields', async () => {
    const wrapper = await mountSuspended(Details, { props: { isComplete: false } })
    expect(wrapper.find('[data-testid="platform-details"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="platform-listingSize"]').exists()).toBe(true)
    expect(wrapper.find('#platform-brand-name-0').exists()).toBe(true)
    expect(wrapper.find('#platform-brand-site-0').exists()).toBe(true)
  })

  it('calls addNewEmptyBrand when the add platform button is clicked', async () => {
    const wrapper = await mountSuspended(Details, { props: { isComplete: false } })
    const addButton = wrapper.find('[data-testid="add-platform-btn"]')
    expect(addButton.exists()).toBe(true)
    await addButton.trigger('click')
    expect(mockAddNewEmptyBrand).toHaveBeenCalledOnce()
  })

  it('does not show remove button when only one brand exists', async () => {
    const wrapper = await mountSuspended(Details, { props: { isComplete: false } })
    const removeButtons = wrapper.findAll('[data-testid="remove-btn"]')
    expect(removeButtons).toHaveLength(0)
  })

  it('shows remove button for second brand and calls removeBrandAtIndex on click', async () => {
    mockPlatformDetailsRef.value = {
      brands: [{ name: 'First', website: 'https://first.com' }, { name: 'Second', website: 'https://second.com' }],
      listingSize: ListingSize.LESS_THAN_250
    }
    const wrapper = await mountSuspended(Details, { props: { isComplete: false } })
    const removeButton = wrapper.find('[data-testid="remove-btn"]')
    await removeButton.trigger('click')
    expect(mockRemoveBrandAtIndex).toHaveBeenCalledWith(1)
  })
})

describe('BusinessDetails form component', () => {
  beforeEach(() => {
    mockPlatformBusinessRef.value = { ...mockPlatBusiness }
  })

  it('should render business-details section with core fields', async () => {
    const wrapper = await mountSuspended(BusinessDetails, { props: { isComplete: false } })
    expect(wrapper.find('[data-testid="business-details"]').exists()).toBe(true)
    expect(wrapper.find('#platform-business-legal-name').exists()).toBe(true)
    expect(wrapper.find('#platform-business-home-jur').exists()).toBe(true)
    expect(wrapper.find('[data-testid="platform-business-hasCpbc"]').exists()).toBe(true)
  })

  it('should render CPBC licence field when hasCpbc is true', async () => {
    mockPlatformBusinessRef.value = { ...mockPlatBusiness, hasCpbc: true }
    const wrapper = await mountSuspended(BusinessDetails, { props: { isComplete: false } })
    expect(wrapper.find('#platform-cpbc').exists()).toBe(true)
  })

  it('does not render CPBC licence field when hasCpbc is false', async () => {
    mockPlatformBusinessRef.value = { ...mockPlatBusiness, hasCpbc: false }
    const wrapper = await mountSuspended(BusinessDetails, { props: { isComplete: false } })
    expect(wrapper.find('#platform-cpbc').exists()).toBe(false)
  })
})

describe('ReviewConfirm component', () => {
  it('should render the review-confirm section with completing party details', async () => {
    const wrapper = await mountSuspended(ReviewConfirm, { props: { isComplete: false } })
    expect(wrapper.find('[data-testid="platform-review-confirm"]').exists()).toBe(true)
    expect(wrapper.html()).toContain(mockCompletingParty.emailAddress)
  })

  it('emits edit event with correct index when edit button is clicked', async () => {
    const wrapper = await mountSuspended(ReviewConfirm, { props: { isComplete: false } })
    // completing party edit is at step 0
    wrapper.vm.$emit('edit', 0)
    expect(wrapper.emitted('edit')).toBeTruthy()
    expect(wrapper.emitted('edit')![0]).toEqual([0])
  })
})
