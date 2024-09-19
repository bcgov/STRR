// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { BcrosFormSectionPropertyForm } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount Property Form Section component', async () => {
  const addressSection = await mountSuspended(BcrosFormSectionPropertyForm,
    {
      global: { plugins: [i18n] },
      props: {
        secondaryContact: false,
        isComplete: false
      }
    })
  expect(addressSection.find('[data-test-id="property-form-section"]').exists()).toBe(true)
})
