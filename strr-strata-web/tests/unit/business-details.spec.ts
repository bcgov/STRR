import { mountSuspended } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { mockStrataBusiness } from '../mocks/mockedData'
import BusinessDetails from '~/components/form/BusinessDetails.vue'

const mockStrataBusinessRef = ref(mockStrataBusiness)
const mockIsMailingInBC = ref(true)
const mockGetBusinessSchema = vi.fn(() => ({}))

vi.mock('@/stores/strataBusiness', () => ({
  useStrrStrataBusinessStore: () => ({
    strataBusiness: mockStrataBusinessRef,
    isMailingInBC: mockIsMailingInBC,
    getBusinessSchema: mockGetBusinessSchema
  })
}))

const mountComponent = (businessOverrides = {}) => {
  mockStrataBusinessRef.value = {
    ...mockStrataBusiness,
    ...businessOverrides
  }

  return mountSuspended(BusinessDetails, {
    props: { isComplete: false }
  })
}

describe('BusinessDetails form component', () => {
  beforeEach(() => {
    mockStrataBusinessRef.value = mockStrataBusiness
    mockIsMailingInBC.value = true
    mockGetBusinessSchema.mockClear()
  })

  it('should render the business details section with form fields', async () => {
    const wrapper = await mountComponent()

    expect(wrapper.find('[data-testid="business-details"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="strata-business-hasRegOffAtt"]').exists()).toBe(true)
  })

  it('should show the registered office address section when hasRegOffAtt is true', async () => {
    const wrapper = await mountComponent({ hasRegOffAtt: true })

    // attorney name field should be visible when hasRegOffAtt is true
    const attorneyName = wrapper.find('#strata-att-for-svc-name')
    expect(attorneyName.exists()).toBe(true)
  })
})
