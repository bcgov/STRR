import { describe, expect, it, vi } from 'vitest'
import { VueWrapper, mount } from '@vue/test-utils'
import { MenuButton } from '@headlessui/vue'

import { BcrosHeaderMenu, BcrosHeaderMenuItem } from '#components'

// NB: MenuItem must be rendered within a Menu component which is why these tests need to mount it inside Menu
describe('Menu Item tests', () => {
  let wrapper: VueWrapper<any>

  const testItemInfo = {
    label: 'Test Label',
    action: vi.fn().mockImplementation(() => {}),
    args: 'test arg',
    icon: 'i-mdi-check',
    setActive: false
  }

  beforeEach(async () => {
    wrapper = mount(
      BcrosHeaderMenu,
      {
        props: {
          menuButtonText: 'menu button',
          menuLists: [{ header: 'list title', items: [testItemInfo] }]
        }
      }
    )
    // NB: dependent on BcrosHeaderMenu component
    expect(wrapper.findComponent(MenuButton).exists()).toBe(true)
    await wrapper.findComponent(MenuButton).trigger('click')
    expect(wrapper.findComponent(BcrosHeaderMenuItem).exists()).toBe(true)
  })
  afterEach(() => { wrapper.unmount() })

  it('renders with required props', async () => {
    expect(wrapper.find('[data-test-id=menu-item]').exists()).toBe(true)
    // has label text
    expect(wrapper.find('[data-test-id=menu-item]').text()).toBe(testItemInfo.label)
    // icon is there
    expect(wrapper.find('[data-test-id=menu-item-icon]').exists()).toBe(true)
    expect(wrapper.find('[data-test-id=menu-item-no-icon]').exists()).toBe(false)
    // active classes are NOT set
    expect(wrapper.find('.text-bcGovColor-activeBlue.bg-bcGovColor-gray1').exists()).toBe(false)
    // updating icon, has expected result
    const itemInfoNoIcon = { ...testItemInfo }
    itemInfoNoIcon.icon = ''
    await wrapper.setProps({
      menuButtonText: 'menu button',
      menuLists: [{
        header: 'list title',
        items: [itemInfoNoIcon]
      }]
    })
    expect(wrapper.find('[data-test-id=menu-item-icon]').exists()).toBe(false)
    expect(wrapper.find('[data-test-id=menu-item-no-icon]').exists()).toBe(true)
  })

  it('triggers item action when clicked', async () => {
    expect(testItemInfo.action).not.toHaveBeenCalled()
    // clicking item activates action
    await wrapper.find('[data-test-id=menu-item]').trigger('click')
    expect(testItemInfo.action).toHaveBeenCalledTimes(1)
    expect(testItemInfo.action).toHaveBeenCalledWith(testItemInfo.args)
  })
})
