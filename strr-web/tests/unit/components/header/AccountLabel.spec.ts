import { describe, it, expect } from 'vitest'
import { VueWrapper, mount } from '@vue/test-utils'

import { BcrosHeaderAccountLabel } from '#components'

describe('Account Label tests', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => { wrapper = mount(BcrosHeaderAccountLabel) })
  afterEach(() => { wrapper.unmount() })

  it('renders with default props', () => {
    expect(wrapper.find('[data-test-id=al-avatar]').exists()).toBe(true)
    // NB: avatar displays first letter of username
    expect(wrapper.find('[data-test-id=al-avatar]').text()).toBe('N')
    expect(wrapper.find('[data-test-id=al-username]').exists()).toBe(true)
    expect(wrapper.find('[data-test-id=al-username]').text()).toBe('N/A')
    expect(wrapper.find('[data-test-id=al-account-name]').exists()).toBe(true)
    expect(wrapper.find('[data-test-id=al-account-name]').text()).toBe('N/A')
  })

  it('displays updated props properly', async () => {
    const avatarClass = 'test-class'
    const accountName = 'Test Account'
    const username = 'Wallaby Tester'

    await wrapper.setProps({ avatarClasses: avatarClass, accountName, username })

    expect(wrapper.find('[data-test-id=al-avatar]').text()).toBe(username.charAt(0))
    expect(wrapper.find('[data-test-id=al-username]').text()).toBe(username)
    expect(wrapper.find('[data-test-id=al-account-name]').text()).toBe(accountName)
  })
})
