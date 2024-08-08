// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { BcrosChip } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount Chip component', async () => {
  const t = useNuxtApp().$i18n.t
  const { getChipFlavour } = useChipFlavour()
  const tRegistryDashboardStatus = (translationKey: string) => t(`registryDashboard.statusChip.${translationKey}`)

  const chip = await mountSuspended(BcrosChip,
    {
      global: { plugins: [i18n] },
      props: {
        flavour: getChipFlavour('APPROVED')
      }
    })
  expect(chip.find('[data-cy="chip"]').exists()).toBe(true)
  expect(chip.text()).toEqual(tRegistryDashboardStatus('approved'))
})
