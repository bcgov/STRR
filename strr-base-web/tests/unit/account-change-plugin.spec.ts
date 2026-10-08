import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockAccountStore = {
  currentAccount: { id: '100' },
  pendingApprovalCount: 4,
  getPendingApprovalCount: vi.fn()
}
const mockIsAuthenticated = { value: true }
const mockKcUser = { value: { keycloakGuid: 'user-1' } }
const mockState = new Map<string, { value: unknown }>()
let accountWatcher: ((accountId: string, previousAccountId: string) => Promise<void>) | undefined

vi.stubGlobal('defineNuxtPlugin', (plugin: unknown) => plugin)
vi.stubGlobal('useConnectAccountStore', () => mockAccountStore)
vi.stubGlobal('useKeycloak', () => ({ isAuthenticated: mockIsAuthenticated, kcUser: mockKcUser }))
vi.stubGlobal('useState', (key: string, init: () => unknown) => {
  if (!mockState.has(key)) {
    mockState.set(key, { value: init() })
  }
  return mockState.get(key)
})
vi.stubGlobal('watch', (_source: unknown, callback: typeof accountWatcher) => {
  accountWatcher = callback
})

const { default: accountChangePlugin } = await import('../../app/plugins/99.account-change.client')

describe('account change plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accountWatcher = undefined
    mockAccountStore.currentAccount = { id: '100' }
    mockAccountStore.pendingApprovalCount = 4
    mockIsAuthenticated.value = true
    mockKcUser.value = { keycloakGuid: 'user-1' }
    mockState.clear()
    mockState.set('account-info-last-fetch', { value: { userId: 'user-1', at: Date.now() } })
    ;(accountChangePlugin as unknown as () => void)()
  })

  it('keeps user account data cached and refreshes notifications on account switch', async () => {
    mockAccountStore.currentAccount = { id: '200' }
    await accountWatcher?.('200', '100')

    expect(mockState.get('account-info-last-fetch')?.value).toEqual({ userId: 'user-1', at: expect.any(Number) })
    expect(mockAccountStore.pendingApprovalCount).toBe(0)
    expect(mockAccountStore.getPendingApprovalCount).toHaveBeenCalledWith(200, 'user-1')
  })

  it('does not react to account changes before the initial account load completes', async () => {
    mockState.get('account-info-last-fetch')!.value = null
    mockAccountStore.currentAccount = { id: '200' }
    await accountWatcher?.('200', '100')

    expect(mockState.get('account-info-last-fetch')?.value).toBeNull()
    expect(mockAccountStore.pendingApprovalCount).toBe(4)
    expect(mockAccountStore.getPendingApprovalCount).not.toHaveBeenCalled()
  })

  it('clears the count and invalidates cache when the account selection is cleared', async () => {
    mockAccountStore.currentAccount = { id: '' }
    await accountWatcher?.('', '100')

    expect(mockState.get('account-info-last-fetch')?.value).toEqual({ userId: 'user-1', at: expect.any(Number) })
    expect(mockAccountStore.pendingApprovalCount).toBe(0)
    expect(mockAccountStore.getPendingApprovalCount).not.toHaveBeenCalled()
  })
})
