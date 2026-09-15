import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useConnectNav } from '@daxiom/nuxt-core-layer-test/app/composables/useConnectNav'
import {
  AccountStatus, AccountType, UserSettingsType, useConnectAccountStore, useRoute
} from '#imports'

enableAutoUnmount(afterEach)

function deferredDecision () {
  let resolveDecision!: (value: boolean) => void
  const promise = new Promise<boolean>((resolve) => { resolveDecision = resolve })
  return { promise, resolve: resolveDecision }
}

describe('core account navigation', () => {
  let store: ReturnType<typeof useConnectAccountStore>
  let route: ReturnType<typeof useRoute>
  let navigation: ReturnType<typeof useConnectNav>

  beforeEach(async () => {
    await mountSuspended(defineComponent({
      setup () {
        store = useConnectAccountStore()
        route = useRoute()
        store.$reset()
        store.userAccounts = ['A', 'B', 'C'].map(id => ({
          id,
          label: `Account ${id}`,
          accountType: AccountType.BASIC,
          accountStatus: AccountStatus.ACTIVE,
          type: UserSettingsType.ACCOUNT,
          urlpath: '',
          urlorigin: ''
        }))
        store.currentAccount = store.userAccounts[0]!
        delete route.meta.onAccountChange
        navigation = useConnectNav()
        return () => h('div')
      }
    }))
  })

  afterEach(() => {
    delete route.meta.onAccountChange
    store.$reset()
  })

  function selectAccount (id: string) {
    const option = navigation.switchAccountOptions.value.find(item => item.label === `Account ${id}`)
    expect(option?.click).toBeTypeOf('function')
    return option!.click!()
  }

  it('switches accounts when no route callback is configured', async () => {
    await selectAccount('B')
    expect(store.currentAccount.id).toBe('B')
  })

  it.each([false, true])('honors a synchronous callback returning %s', async (allowed) => {
    const callback = vi.fn(() => allowed)
    route.meta.onAccountChange = callback
    await selectAccount('B')
    expect(callback).toHaveBeenCalledWith(store.userAccounts[0], store.userAccounts[1])
    expect(store.currentAccount.id).toBe(allowed ? 'B' : 'A')
  })

  it('leaves the account unchanged while navigation is pending', async () => {
    const decision = deferredDecision()
    route.meta.onAccountChange = () => decision.promise
    const pending = selectAccount('B')
    const accountWhilePending = store.currentAccount.id
    decision.resolve(true)
    await pending
    expect(accountWhilePending).toBe('A')
    expect(store.currentAccount.id).toBe('B')
  })

  it('keeps the current account when an asynchronous callback denies the switch', async () => {
    route.meta.onAccountChange = () => Promise.resolve(false)
    await selectAccount('B')
    expect(store.currentAccount.id).toBe('A')
  })

  it('keeps the current account when navigation fails', async () => {
    route.meta.onAccountChange = () => Promise.reject(new Error('Navigation failed'))
    await expect(selectAccount('B')).rejects.toThrow('Navigation failed')
    expect(store.currentAccount.id).toBe('A')
  })

  it('keeps the most recent selection when callbacks finish in reverse order', async () => {
    const first = deferredDecision()
    const second = deferredDecision()
    route.meta.onAccountChange = (_oldAccount, newAccount) => newAccount.id === 'B' ? first.promise : second.promise
    const firstSelection = selectAccount('B')
    const secondSelection = selectAccount('C')
    second.resolve(true)
    await secondSelection
    first.resolve(true)
    await firstSelection
    expect(store.currentAccount.id).toBe('C')
  })

  it('does not apply an older pending selection after the current account is selected', async () => {
    const decision = deferredDecision()
    const callback = vi.fn(() => decision.promise)
    route.meta.onAccountChange = callback
    const pending = selectAccount('B')
    const currentSelection = selectAccount('A')
    decision.resolve(true)
    await Promise.all([pending, currentSelection])
    expect(store.currentAccount.id).toBe('A')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('does not apply an older pending selection after a newer selection is denied', async () => {
    const decision = deferredDecision()
    route.meta.onAccountChange = (_oldAccount, newAccount) => newAccount.id === 'B' ? decision.promise : false
    const pending = selectAccount('B')
    await selectAccount('C')
    decision.resolve(true)
    await pending
    expect(store.currentAccount.id).toBe('A')
  })
})
