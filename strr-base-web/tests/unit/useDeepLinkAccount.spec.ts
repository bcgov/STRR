import { describe, expect, it, vi } from 'vitest'
import { selectDeepLinkAccount, useDeepLinkAccount } from '../../app/composables/useDeepLinkAccount'

const account = (id: number, accountType = 'PREMIUM', accountStatus = 'ACTIVE') => ({
  id,
  accountType,
  accountStatus
}) as any

describe('selectDeepLinkAccount', () => {
  it('selects a matching active account', () => {
    const switchCurrentAccount = vi.fn()
    const accountStore = { userAccounts: [account(2866)], switchCurrentAccount }

    selectDeepLinkAccount(accountStore, { query: { accountId: '2866' } })

    expect(switchCurrentAccount).toHaveBeenCalledWith(2866)
  })

  it('leaves the current account unchanged without an accountId', () => {
    const switchCurrentAccount = vi.fn()
    const accountStore = { userAccounts: [account(2866)], switchCurrentAccount }

    selectDeepLinkAccount(accountStore, { query: {} })

    expect(switchCurrentAccount).not.toHaveBeenCalled()
  })

  it('leaves the current account unchanged for an unknown accountId', () => {
    const switchCurrentAccount = vi.fn()
    const accountStore = { userAccounts: [account(2866)], switchCurrentAccount }

    selectDeepLinkAccount(accountStore, { query: { accountId: '9999' } })

    expect(switchCurrentAccount).not.toHaveBeenCalled()
  })

  it('applies a custom eligibility predicate for Platform accounts', () => {
    const switchCurrentAccount = vi.fn()
    const accountStore = { userAccounts: [account(2866, 'STANDARD')], switchCurrentAccount }

    selectDeepLinkAccount(
      accountStore,
      { query: { accountId: '2866' } },
      candidate => candidate.accountType === 'PREMIUM' && candidate.accountStatus === 'ACTIVE'
    )

    expect(switchCurrentAccount).not.toHaveBeenCalled()
  })

  it('exposes account selection through the composable adapter', () => {
    const switchCurrentAccount = vi.fn()
    const accountStore = { userAccounts: [account(2866)], switchCurrentAccount }
    vi.stubGlobal('useConnectAccountStore', () => accountStore)
    vi.stubGlobal('AccountStatus', { ACTIVE: 'ACTIVE' })

    useDeepLinkAccount().selectFromRoute({ query: { accountId: '2866' } })

    expect(switchCurrentAccount).toHaveBeenCalledWith(2866)
    vi.unstubAllGlobals()
  })
})
