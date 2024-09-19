import { mountSuspended } from '@nuxt/test-utils/runtime'
import { BcrosExistingAccountsList } from '#components'
import { mockAccounts } from '~/tests/mocks/mockAccounts'

test('Contains all the expected elements', async () => {
  const wrapper = await mountSuspended(BcrosExistingAccountsList, {
    props: {
      accounts: mockAccounts
    }
  })

  expect(wrapper.find('[data-test-id="existing-accounts-list"]').exists()).toBe(true)
})
