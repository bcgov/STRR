// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { BcrosHeader } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount Header component', async () => {
  const button = await mountSuspended(BcrosHeader,
    {
      global: { plugins: [i18n] },
      props: {
        title: ''
      }
    })
  expect(button.find('[data-test-id="header"]').exists()).toBe(true)
})
