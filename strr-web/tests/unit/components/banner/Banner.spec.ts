// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { BcrosBanner, BcrosButtonsPrimary } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount Banner component with buttons', async () => {
  const banner = await mountSuspended(BcrosBanner,
    {
      global: { plugins: [i18n] },
      props: {}
    })
  expect(banner.find('[data-cy="banner"]').exists()).toBe(true)
  expect(banner.findComponent(BcrosButtonsPrimary).exists()).toBe(true)
})

it('can mount Banner component with hidden buttons', async () => {
  const banner = await mountSuspended(BcrosBanner,
    {
      global: { plugins: [i18n] },
      props: { hideButtons: true }
    })
  expect(banner.find('[data-cy="banner"]').exists()).toBe(true)
  expect(banner.findComponent(BcrosButtonsPrimary).exists()).toBe(false)
})
