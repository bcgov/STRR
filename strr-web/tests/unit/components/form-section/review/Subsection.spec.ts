// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { BcrosFormSectionReviewSubsection } from '#components'
import { mockPrimaryContact } from '~/tests/mocks/mockApplication'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount form subsection component', async () => {
  const addressSection = await mountSuspended(BcrosFormSectionReviewSubsection,
    {
      global: { plugins: [i18n] },
      props: {
        state: mockPrimaryContact,
        primary: true
      }
    })
  expect(addressSection.find('[data-test-id="form-subsection"]').exists()).toBe(true)
})
