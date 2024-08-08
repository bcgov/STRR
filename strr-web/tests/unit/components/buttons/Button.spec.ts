// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'

import { mockFn } from '@nuxt/test-utils'
import { BcrosButtonsPrimary } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount Button component', async () => {
  const buttonText = 'Button Text'
  const button = await mountSuspended(BcrosButtonsPrimary,
    {
      global: { plugins: [i18n] },
      props: {
        action: mockFn,
        icon: 'i-mdi-hamburger',
        label: buttonText
      }
    })
  expect(button.find('[data-cy="button"]').exists()).toBe(true)
  expect(button.text()).toEqual(buttonText)
})
