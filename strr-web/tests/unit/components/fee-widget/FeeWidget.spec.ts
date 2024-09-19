// @vitest-environment nuxt
import { it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { FeeWidget } from '#components'
import { mockHostApplicationFee } from '~/tests/mocks/mockFees'

it('can mount Fee Widget component', async () => {
  const container = await mountSuspended(FeeWidget, {
    props: {
      fee: mockHostApplicationFee
    }
  })
  expect(container.find('[data-test-id="fee-widget"]').exists()).toBe(true)
})
