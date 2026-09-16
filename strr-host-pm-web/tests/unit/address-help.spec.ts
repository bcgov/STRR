import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import AddressHelp from '~/components/form/UnitAddress/Help.vue'

enableAutoUnmount(afterEach)

describe('address help controls', () => {
  it('opens, closes with Hide, and reopens', async () => {
    const wrapper = await mountSuspended(AddressHelp, {
      attachTo: document.body,
      props: { helpTitle: 'Address help' }
    })
    const toggle = wrapper.get('[aria-expanded]')
    const buttons = wrapper.findAll('button')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('h4').isVisible()).toBe(false)

    await buttons[0]!.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('h4').isVisible()).toBe(true)

    await buttons[1]!.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('h4').isVisible()).toBe(false)

    await buttons[0]!.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('h4').isVisible()).toBe(true)
  })

  it('toggles with the keyboard and retains the address label', async () => {
    const wrapper = await mountSuspended(AddressHelp, {
      attachTo: document.body,
      props: { helpTitle: 'Address help', label: 'Rental address' }
    })
    const toggle = wrapper.get('[aria-expanded]')
    expect(wrapper.text()).toContain('Rental address')
    await toggle.trigger('keydown', { key: 'Enter' })
    expect(toggle.attributes('aria-expanded')).toBe('true')
    await toggle.trigger('keydown', { key: ' ' })
    expect(toggle.attributes('aria-expanded')).toBe('false')
  })
})
