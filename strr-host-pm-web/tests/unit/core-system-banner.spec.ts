import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'
import SystemBanner from '@daxiom/nuxt-core-layer-test/app/components/Connect/SystemBanner.vue'

const flags = vi.hoisted(() => ({
  text: '', ready: vi.fn(), sanitize: undefined as typeof DOMPurify.sanitize | undefined
}))
mockNuxtImport('useConnectLaunchdarklyStore', () => () => ({
  ldClient: { waitUntilReady: flags.ready },
  getStoredFlag: () => flags.text
}))
mockNuxtImport('useNuxtApp', original => () => Object.assign(Object.create(original()), {
  $sanitize: (html: string) => flags.sanitize?.(html) ?? ''
}))

enableAutoUnmount(afterEach)

describe('core system banner', () => {
  let dom: JSDOM
  beforeEach(() => {
    // DOMPurify does not support happy-dom; use its JSDOM integration for sanitization.
    dom = new JSDOM('')
    flags.sanitize = DOMPurify(dom.window).sanitize
    flags.ready.mockReset().mockResolvedValue(undefined)
    flags.text = '<a href="https://example.invalid/help">Help</a>'
  })

  afterEach(() => { dom.window.close() })

  it('renders safe links while removing script and event-handler markup', async () => {
    flags.text = '<script>alert("synthetic")</script><p onclick="alert(1)">Notice</p>' + flags.text
    const wrapper = await mountSuspended(SystemBanner)
    await flushPromises()
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.find('[onclick]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Notice')
    expect(wrapper.get('a').attributes('href')).toBe('https://example.invalid/help')
    expect(wrapper.find('button[aria-label="Close"]').exists()).toBe(false)
  })

  it('preserves close-button styling and dismisses the visible banner', async () => {
    const wrapper = await mountSuspended(SystemBanner, { props: { dismissible: true } })
    await flushPromises()
    const close = wrapper.get('button[aria-label="Close"]')
    expect(close.classes()).toContain('pr-2')
    expect(close.classes()).toContain('text-gray-900')
    expect(wrapper.attributes('style') ?? '').not.toContain('display: none')
    await close.trigger('click')
    await flushPromises()
    expect(wrapper.attributes('style')).toContain('display: none')
  })

  it('hides an empty banner', async () => {
    flags.text = ''
    const wrapper = await mountSuspended(SystemBanner)
    await flushPromises()
    expect(wrapper.attributes('style')).toContain('display: none')
  })
})
