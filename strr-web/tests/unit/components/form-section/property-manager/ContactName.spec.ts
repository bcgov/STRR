import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { BcrosFormSectionContactName } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})
let wrapper: any

it('can mount Contact Name component', async () => {
  wrapper = await mountSuspended(BcrosFormSectionContactName,
    {
      global: { plugins: [i18n] },
      props: {
        errors: {}
      }
    }
  )
  expect(wrapper.findTestId('form-section-contact-name').exists()).toBe(true)
  expect(wrapper.findTestId('contact-first-name-input').exists()).toBe(true)
  expect(wrapper.findTestId('contact-middle-name-input').exists()).toBe(true)
  expect(wrapper.findTestId('contact-last-name-input').exists()).toBe(true)
  expect(wrapper.findTestId('property-manager-preferred-name-input').exists()).toBe(true)
})

it('emits events on input changes', async () => {
  wrapper = await mountSuspended(BcrosFormSectionContactName,
    {
      global: { plugins: [i18n] },
      props: {
        errors: {}
      }
    })

  const firstNameInput = wrapper.findTestId('contact-first-name-input')
  await firstNameInput.trigger('input')
  expect(wrapper.emitted('resetFieldError')).toBeTruthy()

  await firstNameInput.trigger('blur')
  expect(wrapper.emitted('validateField')).toBeTruthy()

  const lastNameInput = wrapper.findTestId('contact-last-name-input')
  await lastNameInput.trigger('input')
  expect(wrapper.emitted('resetFieldError')).toBeTruthy()

  await lastNameInput.trigger('blur')
  expect(wrapper.emitted('validateField')).toBeTruthy()
})

it('does emit events for middle name and preferred name inputs', async () => {
  wrapper = await mountSuspended(BcrosFormSectionContactName,
    {
      global: { plugins: [i18n] },
      props: {
        errors: {}
      }
    })

  const middleNameInput = wrapper.findTestId('contact-middle-name-input')
  await middleNameInput.trigger('input')
  await middleNameInput.trigger('blur')

  const preferredNameInput = wrapper.findTestId('property-manager-preferred-name-input')
  await preferredNameInput.trigger('input')
  await preferredNameInput.trigger('blur')

  expect(wrapper.emitted('resetFieldError')).toBeTruthy()
  expect(wrapper.emitted('validateField')).toBeTruthy()
})
