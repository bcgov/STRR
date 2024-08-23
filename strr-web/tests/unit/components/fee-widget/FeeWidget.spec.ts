// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { BcrosFeeWidget } from '#components'

it('can mount Fee Widget component', async () => {
  const container = await mountSuspended(BcrosFeeWidget)
  expect(container.find('[data-test-id="fee-widget"]').exists()).toBe(true)
})
