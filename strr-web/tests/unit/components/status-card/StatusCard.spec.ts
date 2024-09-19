// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { mockApplicationApproved } from '~/tests/mocks/mockApplication'
import { BcrosStatusCard } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount status card component', async () => {
  const applicationHeader: ApplicationHeaderI = mockApplicationApproved.header

  const addressSection = await mountSuspended(BcrosStatusCard,
    {
      global: { plugins: [i18n] },
      props: {
        isSingle: true,
        applicationHeader
      }
    })
  expect(addressSection.find('[data-test-id="status-card"]').exists()).toBe(true)
  expect(addressSection.classes()).toContain('flex-1')
  expect(addressSection.text()).toContain(applicationHeader.registrationNumber)
})

it('can mount one of many status card components', async () => {
  const applicationHeader: ApplicationHeaderI = mockApplicationApproved.header

  const addressSection = await mountSuspended(BcrosStatusCard,
    {
      global: { plugins: [i18n] },
      props: {
        isSingle: false,
        applicationHeader
      }
    })
  expect(addressSection.find('[data-test-id="status-card"]').exists()).toBe(true)
  expect(addressSection.classes()).not.toContain('flex-1')
})
