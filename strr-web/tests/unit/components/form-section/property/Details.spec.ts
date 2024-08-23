// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { BcrosFormSectionPropertyDetails } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount Property Details Form Section component', async () => {
  const addressSection = await mountSuspended(BcrosFormSectionPropertyDetails,
    {
      global: { plugins: [i18n] }
    })
  expect(addressSection.find('[data-test-id="property-details"]').exists()).toBe(true)
})
