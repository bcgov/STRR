import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed, watch } from 'vue'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import { ConnectPayCfsStatus } from '../../app/enums/connect-pay-cfs-status'

vi.stubGlobal('ConnectPayCfsStatus', ConnectPayCfsStatus)
vi.stubGlobal('ref', ref)
vi.stubGlobal('computed', computed)
vi.stubGlobal('watch', watch)
vi.stubGlobal('defineStore', defineStore)
vi.stubGlobal('useNuxtApp', () => ({
  $payApi: vi.fn(),
  $i18n: { t: (key: string) => key }
}))

const { useConnectFeeStore } = await import('../../app/stores/connectFee')

describe('connectFee store - setPlaceholderServiceFee', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('sets the placeholder service fee', () => {
    const store = useConnectFeeStore()
    store.setPlaceholderServiceFee(1.5)
    expect(store.placeholderFeeItem.serviceFees).toBe(1.5)
  })

  it('defaults to 0 when the fee is undefined (e.g. Pay API unavailable)', () => {
    const store = useConnectFeeStore()
    store.setPlaceholderServiceFee(1.5)
    store.setPlaceholderServiceFee(undefined)
    expect(store.placeholderFeeItem.serviceFees).toBe(0)
  })
})
