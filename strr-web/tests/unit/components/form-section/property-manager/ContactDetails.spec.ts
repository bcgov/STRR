import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { BcrosFormSectionPropertyManagerContactDetails, BcrosAlertsMessage } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})
let wrapper: any

it('can mount Contact Details component', async () => {
  wrapper = await mountSuspended(BcrosFormSectionPropertyManagerContactDetails,
    {
      global: { plugins: [i18n] },
      props: {
        errors: {}
      }
    })
  expect(wrapper.findTestId('property-manager-contact-details').exists()).toBe(true)
  expect(wrapper.findTestId('property-manager-phone-number').exists()).toBe(true)
  expect(wrapper.findTestId('property-manager-extension').exists()).toBe(true)
  expect(wrapper.findTestId('property-manager-fax-number').exists()).toBe(true)
  expect(wrapper.findTestId('property-manager-email-address').exists()).toBe(true)
  expect(wrapper.findComponent(BcrosAlertsMessage).exists()).toBe(true)
})

it('emits events on input changes', async () => {
  wrapper = await mountSuspended(BcrosFormSectionPropertyManagerContactDetails,
    {
      global: { plugins: [i18n] },
      props: {
        errors: {}
      }
    })
  await wrapper.findTestId('property-manager-phone-number').trigger('input')
  expect(wrapper.emitted('resetFieldError')).toBeTruthy()
  await wrapper.findTestId('property-manager-phone-number').trigger('blur')
  expect(wrapper.emitted('validateField')).toBeTruthy()
})
