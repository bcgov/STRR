import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { BcrosFormSectionContactDetails, BcrosAlertsMessage } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})
let wrapper: any

it('can mount Contact Details component', async () => {
  wrapper = await mountSuspended(BcrosFormSectionContactDetails,
    {
      global: { plugins: [i18n] },
      props: {
        errors: {}
      }
    })
  expect(wrapper.findTestId('form-section-contact-details').exists()).toBe(true)
  expect(wrapper.findTestId('phone-number').exists()).toBe(true)
  expect(wrapper.findTestId('extension').exists()).toBe(true)
  expect(wrapper.findTestId('fax-number').exists()).toBe(true)
  expect(wrapper.findTestId('email-address').exists()).toBe(true)
  expect(wrapper.findComponent(BcrosAlertsMessage).exists()).toBe(true)
})

it('emits events on input changes', async () => {
  wrapper = await mountSuspended(BcrosFormSectionContactDetails,
    {
      global: { plugins: [i18n] },
      props: {
        errors: {}
      }
    })
  await wrapper.findTestId('phone-number').trigger('input')
  expect(wrapper.emitted('resetFieldError')).toBeTruthy()
  await wrapper.findTestId('phone-number').trigger('blur')
  expect(wrapper.emitted('validateField')).toBeTruthy()
})
