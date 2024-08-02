// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { BcrosStatusCard } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount status card component', async () => {
  const { getChipFlavour } = useChipFlavour()
  const flavour = getChipFlavour('APPROVED')
  const applicationId = '1'
  const registrationNumber = 'BCH-example'
  const addressSection = await mountSuspended(BcrosStatusCard,
    {
      global: { plugins: [i18n] },
      props: {
        single: true,
        applicationId,
        flavour,
        registrationNumber
      }
    })
  expect(addressSection.find('[data-cy="status-card"]').exists()).toBe(true)
  expect(addressSection.classes()).toContain('flex-1')
  expect(addressSection.text()).toContain(registrationNumber)
})

it('can mount one of many status card components', async () => {
  const { getChipFlavour } = useChipFlavour()
  const flavour = getChipFlavour('APPROVED')
  const applicationId = '1'
  const registrationNumber = 'BCH-example'
  const addressSection = await mountSuspended(BcrosStatusCard,
    {
      global: { plugins: [i18n] },
      props: {
        single: false,
        applicationId,
        flavour,
        registrationNumber
      }
    })
  expect(addressSection.find('[data-cy="status-card"]').exists()).toBe(true)
  expect(addressSection.classes()).not.toContain('flex-1')
})
