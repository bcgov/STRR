import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { mockHostApplicationWithFlags } from '../mocks/mockedData'
import { enI18n } from '../mocks/i18n'
import ApplicationDetails from '~/pages/examine/[applicationId].vue'
import { HostSubHeader, HostSupportingInfo } from '#components'

vi.mock('@/stores/examiner', () => ({
  useExaminerStore: () => ({
    getNextApplication: vi.fn().mockResolvedValue(mockHostApplicationWithFlags),
    activeReg: ref(mockHostApplicationWithFlags.registration),
    activeHeader: ref(mockHostApplicationWithFlags.header),
    activeRecord: ref(mockHostApplicationWithFlags),
    isApplication: ref(true)
  })
}))

describe('Host Application Alert Flags', () => {
  let wrapper: any

  beforeAll(async () => {
    wrapper = await mountSuspended(ApplicationDetails, {
      global: { plugins: [enI18n] }
    })
  })

  it('renders alert flags', () => {
    expect(wrapper.exists()).toBe(true)

    const hostSubHeader = wrapper.findComponent(HostSubHeader)
    expect(hostSubHeader.findTestId('flag-host-business').exists()).toBe(true)
    expect(hostSubHeader.findTestId('flag-unit-number-missing').exists()).toBe(true)
    expect(hostSubHeader.findTestId('flag-exceeds-reg-limit').exists()).toBe(true)

    const hostSupportingInfo = wrapper.findComponent(HostSupportingInfo)
    expect(hostSupportingInfo.findTestId('str-prohibited-section').exists()).toBe(true)
    expect(hostSupportingInfo.findTestId('flag-str-prohibited').exists()).toBe(true)
  })
})
