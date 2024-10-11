// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { BcrosChip } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount Chip component', async () => {
  const { t } = useTranslation()
  const { getChipFlavour } = useChipFlavour()
  const tStatuses = (translationKey: string) => t(`statuses.${translationKey}`)

  const chip = await mountSuspended(BcrosChip,
    {
      global: { plugins: [i18n] },
      props: {
        flavour: getChipFlavour('ACTIVE')
      }
    })
  expect(chip.find('[data-test-id="chip"]').exists()).toBe(true)
  expect(chip.text()).toEqual(tStatuses('active'))
})
