// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { BcrosContainer } from '#components'

it('can mount Container component', async () => {
  const container = await mountSuspended(BcrosContainer)
  expect(container.find('[data-test-id="container"]').exists()).toBe(true)
})
