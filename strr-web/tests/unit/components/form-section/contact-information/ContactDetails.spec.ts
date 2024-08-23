// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'

import { BcrosFormSectionContactInformationContactDetails } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount primary Contact Details Form Section component', async () => {
  const contactDetails = await mountSuspended(BcrosFormSectionContactInformationContactDetails,
    {
      global: { plugins: [i18n] },
      props: { isPrimary: true }
    })
  expect(contactDetails.find('[data-test-id="form-section-contact-info"]').exists()).toBe(true)
  expect(contactDetails.find('[name="firstName"]').exists()).toBe(false)
})

it('can mount secondary Contact Details Form Section component', async () => {
  const contactDetails = await mountSuspended(BcrosFormSectionContactInformationContactDetails,
    {
      global: { plugins: [i18n] },
      props: { isPrimary: false }
    })
  expect(contactDetails.find('[data-test-id="form-section-contact-info"]').exists()).toBe(true)
  expect(contactDetails.find('[name="firstName"]').exists()).toBe(true)
})
