import { it, expect, describe, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { BcrosFormSectionPropertyManagerForm, URadioGroup } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

describe('BcrosFormSectionPropertyManagerForm', () => {
  let wrapper: any

  beforeEach(async () => {
    wrapper = await mountSuspended(BcrosFormSectionPropertyManagerForm, {
      global: { plugins: [i18n] },
      props: {
        isComplete: false
      }
    })
  })

  it('renders the component', () => {
    expect(wrapper.findTestId('property-manager-is-pm').exists()).toBe(true)
  })

  it('shows property manager role radio buttons', () => {
    const radioGroup = wrapper.findComponent(URadioGroup)
    expect(radioGroup.exists()).toBe(true)
    expect(radioGroup.props('options')).toHaveLength(2)
  })

  it('shows property manager radio when not in property manager role', async () => {
    await wrapper.find('[data-test-id="property-manager-is-pm"] input[value="false"]').setValue(true)
    await wrapper.find('[data-test-id="property-manager-is-pm"] input[value="true"]').setValue(true)
    expect(wrapper.findTestId('property-manager-has-pm').exists()).toBe(false)
  })

  it('shows property manager form when has property manager', async () => {
    await wrapper.find('[data-test-id="property-manager-is-pm"] input[value="false"]').setValue(true)
    await wrapper.find('[data-test-id="property-manager-has-pm"] input[value="true"]').setValue(true)
    expect(wrapper.findTestId('property-manager-form').exists()).toBe(true)
  })

  it('shows property manager form when in property manager role', async () => {
    await wrapper.find('[data-test-id="property-manager-is-pm"] input[value="false"]').setValue(true)
    expect(wrapper.findTestId('property-manager-form').exists()).toBe(true)
  })
})
