// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { BcrosFormSectionPropertyAddress } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount address section component', async () => {
  const addressSection = await mountSuspended(BcrosFormSectionPropertyAddress,
    {
      global: { plugins: [i18n] }
    })
  expect(addressSection.find('[data-cy="form-section-address"]').exists()).toBe(true)
})
