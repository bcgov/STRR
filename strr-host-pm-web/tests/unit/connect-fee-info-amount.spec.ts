import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect, beforeEach } from 'vitest'
import { baseEnI18n } from '../mocks/i18n'
import { ConnectFeeInfoAmount } from '#components'
import { FeeInfo } from '#imports'

const $t = baseEnI18n.global.t

const mockFeeItem: ConnectFeeItem = {
  filingTypeCode: 'STRR',
  filingType: 'strr',
  filingFees: 50,
  total: 50,
  futureEffectiveFees: 0,
  priorityFees: 0,
  processingFees: 0,
  serviceFees: 0,
  tax: { gst: 0, pst: 0 }
}

const mountComponent = () =>
  mountSuspended(ConnectFeeInfoAmount, {
    global: { plugins: [baseEnI18n] }
  })

describe('ConnectFeeInfoAmount', () => {
  beforeEach(() => {
    const store = useConnectFeeStore()
    store.setFeeInfo(undefined)
    store.addReplaceFee(mockFeeItem)
  })

  it('should not render component when feeInfo is not set', async () => {
    const wrapper = await mountComponent()
    expect(wrapper.find('[data-testid="fee-info-1"]').exists()).toBe(false)
  })

  it('should render component when feeInfo is set', async () => {
    useConnectFeeStore().setFeeInfo(FeeInfo.FEE_INFO_1)
    const wrapper = await mountComponent()
    expect(wrapper.find('button').text()).toContain($t('ConnectFeeInfo.title'))
  })

  it('should render info for FEE_INFO_1', async () => {
    useConnectFeeStore().setFeeInfo(FeeInfo.FEE_INFO_1)
    const wrapper = await mountComponent()
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('p').text()).toBe($t('ConnectFeeInfo.scenarios.primaryResidence.heading'))
    expect(wrapper.find('[data-testid="fee-info-1"]').exists()).toBe(true)
  })

  it('should render info for FEE_INFO_2', async () => {
    useConnectFeeStore().setFeeInfo(FeeInfo.FEE_INFO_2)
    const wrapper = await mountComponent()
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('p').text()).toBe($t('ConnectFeeInfo.scenarios.separateUnit.heading'))
    expect(wrapper.find('[data-testid="fee-info-2"]').exists()).toBe(true)
  })

  it('should render info for FEE_INFO_3', async () => {
    useConnectFeeStore().setFeeInfo(FeeInfo.FEE_INFO_3)
    const wrapper = await mountComponent()
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('p').text()).toBe($t('ConnectFeeInfo.scenarios.differentProperty.heading'))
    expect(wrapper.find('[data-testid="fee-info-3"]').exists()).toBe(true)
  })
})
