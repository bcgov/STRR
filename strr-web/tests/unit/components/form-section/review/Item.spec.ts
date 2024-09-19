// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { BcrosFormSectionReviewItem } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount form review component', async () => {
  const FORM_TITLE = 'Test Title'

  const addressSection = await mountSuspended(BcrosFormSectionReviewItem,
    {
      global: { plugins: [i18n] },
      props: {
        title: FORM_TITLE
      }
    })
  expect(addressSection.find('[data-test-id="form-item"]').exists()).toBe(true)
  expect(addressSection.text()).toContain(FORM_TITLE)
})
