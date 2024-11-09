// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { BcrosFormSectionContactDetails } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount primary Contact Details Form Section component', async () => {
  const contactDetails = await mountSuspended(BcrosFormSectionContactDetails,
    {
      global: { plugins: [i18n] },
      props: { errors: {} }
    })
  expect(contactDetails.find('[data-test-id="form-section-contact-details"]').exists()).toBe(true)
  expect(contactDetails.find('[data-test-id="phone-number"]').exists()).toBe(true)
  expect(contactDetails.find('[data-test-id="extension"]').exists()).toBe(true)
  expect(contactDetails.find('[data-test-id="fax-number"]').exists()).toBe(true)
  expect(contactDetails.find('[data-test-id="email-address"]').exists()).toBe(true)
})
