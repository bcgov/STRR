import { mountSuspended } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockStrataBusiness } from '../mocks/mockedData'
import SummaryBusiness from '~/components/summary/Business.vue'

const mockStrataBusinessRef = ref(mockStrataBusiness)

vi.mock('@/stores/strataBusiness', () => ({
  useStrrStrataBusinessStore: () => ({
    strataBusiness: mockStrataBusinessRef
  })
}))

const mountComponent = (businessOverrides = {}) => {
  mockStrataBusinessRef.value = {
    ...mockStrataBusiness,
    ...businessOverrides
  }

  return mountSuspended(SummaryBusiness)
}

describe('Summary Business component', () => {
  beforeEach(() => {
    mockStrataBusinessRef.value = mockStrataBusiness
  })

  it('should render the legalName from the store', async () => {
    const wrapper = await mountComponent({ legalName: 'Acme Corp' })
    expect(wrapper.text()).toContain('Acme Corp')
  })

  it('should render homeJurisdiction', async () => {
    const wrapper = await mountComponent({ homeJurisdiction: 'BC' })
    expect(wrapper.text()).toContain('BC')
  })

  it('should render businessNumber', async () => {
    const wrapper = await mountComponent({ businessNumber: '123456789' })
    expect(wrapper.text()).toContain('123456789')
  })

  it('should show fallback text when homeJurisdiction is empty', async () => {
    const wrapper = await mountComponent({ homeJurisdiction: '' })
    expect(wrapper.text()).toContain('Not Entered')
  })

  it('should render a table with business data', async () => {
    const wrapper = await mountComponent({
      legalName: 'BC Hotels Ltd',
      homeJurisdiction: 'BC',
      businessNumber: '987654321'
    })

    expect(wrapper.text()).toContain('BC Hotels Ltd')
    expect(wrapper.text()).toContain('BC')
    expect(wrapper.text()).toContain('987654321')
  })
})
