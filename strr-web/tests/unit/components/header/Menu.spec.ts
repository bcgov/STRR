import { describe, expect, it, vi } from 'vitest'
import { VueWrapper, mount } from '@vue/test-utils'
import { MenuButton, MenuItems } from '@headlessui/vue'

import { BcrosHeaderMenu, BcrosHeaderMenuItem } from '#components'

describe('Menu tests', () => {
  let wrapper: VueWrapper<any>

  const testItems1 = [
    {
      label: 'Test Label 1',
      action: vi.fn().mockImplementation(() => {}),
      args: 'test arg 1'
    },
    {
      label: 'Test Label 2',
      action: vi.fn().mockImplementation(() => {}),
      args: 'test arg 2',
      icon: 'i-mdi-check',
      setActive: true
    }
  ]
  const testItems2 = [{ label: 'Test Label 3', setActive: true }]
  const testProps = {
    menuButtonText: 'test menu button',
    menuLists: [{ header: 'test menu title 1', items: testItems1 }, { header: 'test menu title 2', items: testItems2 }]
  }

  beforeEach(() => { wrapper = mount(BcrosHeaderMenu, { props: testProps }) })
  afterEach(() => { wrapper.unmount() })

  it('renders with required props', () => {
    expect(wrapper.findComponent(MenuButton).exists()).toBe(true)
    expect(wrapper.findComponent(MenuButton).text()).toBe(testProps.menuButtonText)
    // menu list should be closed
    expect(wrapper.findComponent(BcrosHeaderMenuItem).exists()).toBe(false)
  })

  it('opens the menu with expected items', async () => {
    // click menu button
    await wrapper.findComponent(MenuButton).trigger('click')
    // verify items
    const menuItems = wrapper.findComponent(MenuItems)
    expect(menuItems.exists()).toBe(true)
    expect(menuItems.findAll('[data-test-id=menu-list]').length).toBe(testProps.menuLists.length)

    for (let i = 0; i < testProps.menuLists.length; i++) {
      const menuList = menuItems.findAll('[data-test-id=menu-list]').at(i)
      expect(menuList?.exists()).toBe(true)
      expect(menuList?.find('[data-test-id=menu-list-header]').text()).toBe(testProps.menuLists[i].header)
      expect(menuList?.findAllComponents(BcrosHeaderMenuItem).length).toBe(testProps.menuLists[i].items.length)
    }
  })
})
