import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Expiring from '@daxiom/nuxt-core-layer-test/app/components/Connect/Modal/Session/Expiring.vue'

mockNuxtImport('useRuntimeConfig', original => () => {
  const config = original()
  return { ...config, public: { ...config.public, sessionExpiredModalTimeout: 32000 } }
})

enableAutoUnmount(afterEach)

const onModelUpdate = vi.fn()
const mountModal = () => mountSuspended(Expiring, {
  props: { modelValue: true, 'onUpdate:modelValue': onModelUpdate },
  global: {
    stubs: {
      UModal: { template: '<div><slot /></div>' },
      ConnectI18nHelper: {
        props: ['count'],
        template: '<p data-testid="session-countdown">{{ count }}</p>'
      }
    }
  }
})

describe('core session expiry modal', () => {
  beforeEach(() => {
    onModelUpdate.mockClear()
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('counts down in seconds, announces expiry, and stops at zero', async () => {
    const wrapper = await mountModal()
    const countdown = () => wrapper.get('[data-testid="session-countdown"]').text()
    expect(countdown()).toBe('32')

    vi.advanceTimersByTime(2000)
    await nextTick()
    expect(countdown()).toBe('30')
    expect(wrapper.get('.sr-only').text()).not.toBe('')

    vi.advanceTimersByTime(28000)
    await nextTick()
    expect(countdown()).toBe('2')
    expect(wrapper.get('.sr-only').text()).not.toBe('')

    vi.advanceTimersByTime(5000)
    await nextTick()
    expect(countdown()).toBe('0')
  })

  it('releases its countdown timer on unmount and creates one fresh timer on remount', async () => {
    const initialTimers = vi.getTimerCount()
    const first = await mountModal()
    expect(vi.getTimerCount()).toBe(initialTimers + 1)
    first.unmount()
    expect(vi.getTimerCount()).toBe(initialTimers)

    const second = await mountModal()
    expect(vi.getTimerCount()).toBe(initialTimers + 1)
    expect(second.get('[data-testid="session-countdown"]').text()).toBe('32')
    second.unmount()
    expect(vi.getTimerCount()).toBe(initialTimers)
  })

  it('closes on a keypress and removes its keyboard listener on unmount', async () => {
    const wrapper = await mountModal()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    await nextTick()
    expect(onModelUpdate).toHaveBeenCalledExactlyOnceWith(false)

    wrapper.unmount()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(onModelUpdate).toHaveBeenCalledExactlyOnceWith(false)
  })
})
