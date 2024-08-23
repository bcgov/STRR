// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { BcrosFormSectionReviewItem } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount form review component', async () => {
  const addressSection = await mountSuspended(BcrosFormSectionReviewItem,
    {
      global: { plugins: [i18n] }
    })
  expect(addressSection.find('[data-test-id="form-item"]').exists()).toBe(true)
})
