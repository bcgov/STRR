// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { BcrosFormSectionPropertyListingDetails } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount Listing Details Form Section component', async () => {
  const addressSection = await mountSuspended(BcrosFormSectionPropertyListingDetails,
    {
      global: { plugins: [i18n] }
    })
  expect(addressSection.find('[data-test-id="listing-details-section"]').exists()).toBe(true)
})
