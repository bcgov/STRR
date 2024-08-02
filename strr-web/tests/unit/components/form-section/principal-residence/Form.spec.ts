// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createI18n } from 'vue-i18n'
import { BcrosFormSectionPrincipalResidenceForm } from '#components'

const i18n = createI18n({
  // vue-i18n options here ...
})

it('can mount Principal Residence Form Section component', async () => {
  const principalResidence = await mountSuspended(BcrosFormSectionPrincipalResidenceForm,
    {
      global: { plugins: [i18n] },
      props: { isComplete: true }
    })
  expect(principalResidence.find('[data-cy="principal-residence-form"]').exists()).toBe(true)
})
