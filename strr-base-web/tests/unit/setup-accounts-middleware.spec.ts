import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, reactive } from 'vue'

const mockIsAuthenticated = ref(true)
const mockKcUser = ref({ keycloakGuid: 'user-1' })
const mockAccountStore = reactive({
  currentAccount: { id: '', label: undefined as string | undefined, accountStatus: undefined as string | undefined },
  userAccounts: [] as Array<{ id: string }>,
  getUserAccounts: vi.fn(),
  setUserName: vi.fn(),
  checkAccountStatus: vi.fn(),
  getPendingApprovalCount: vi.fn()
})
const mockState = new Map<string, ReturnType<typeof ref>>()

vi.stubGlobal('defineNuxtRouteMiddleware', (fn: unknown) => fn)
vi.stubGlobal('useKeycloak', () => ({ isAuthenticated: mockIsAuthenticated, kcUser: mockKcUser }))
vi.stubGlobal('useConnectAccountStore', () => mockAccountStore)
vi.stubGlobal('useState', (key: string, init: () => unknown) => {
  if (!mockState.has(key)) {
    mockState.set(key, ref(init()))
  }
  return mockState.get(key)
})

const { default: setupAccounts } = await import('../../app/middleware/01.setup-accounts.global')
const runMiddleware = () => (setupAccounts as unknown as () => Promise<void>)()

describe('01.setup-accounts.global middleware', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockState.clear()
    mockIsAuthenticated.value = true
    mockKcUser.value = { keycloakGuid: 'user-1' }
    mockAccountStore.currentAccount = { id: '' }
    mockAccountStore.userAccounts = []
    mockAccountStore.getUserAccounts.mockResolvedValue([{ id: '100' }])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does nothing when the user is not authenticated', async () => {
    mockIsAuthenticated.value = false
    await runMiddleware()
    expect(mockAccountStore.getUserAccounts).not.toHaveBeenCalled()
    expect(mockAccountStore.checkAccountStatus).not.toHaveBeenCalled()
  })

  it('fetches account info on the first navigation', async () => {
    await runMiddleware()
    expect(mockAccountStore.getUserAccounts).toHaveBeenCalledTimes(1)
    expect(mockAccountStore.currentAccount.id).toBe('100')
    expect(mockAccountStore.userAccounts).toEqual([{ id: '100' }])
    expect(mockAccountStore.setUserName).toHaveBeenCalledTimes(1)
    expect(mockAccountStore.checkAccountStatus).toHaveBeenCalledTimes(1)
    expect(mockAccountStore.getPendingApprovalCount).toHaveBeenCalledWith(100, 'user-1')
  })

  it('replaces the selected account with its refreshed data', async () => {
    mockAccountStore.currentAccount = { id: '100', label: 'Old name', accountStatus: 'SUSPENDED' }
    mockAccountStore.getUserAccounts.mockResolvedValue([
      { id: '100', label: 'Updated name', accountStatus: 'ACTIVE' }
    ])

    await runMiddleware()

    expect(mockAccountStore.currentAccount).toEqual({ id: '100', label: 'Updated name', accountStatus: 'ACTIVE' })
  })

  it('uses the cached account info on later navigations but still checks account status', async () => {
    await runMiddleware()
    await runMiddleware()
    expect(mockAccountStore.getUserAccounts).toHaveBeenCalledTimes(1)
    expect(mockAccountStore.getPendingApprovalCount).toHaveBeenCalledTimes(1)
    expect(mockAccountStore.checkAccountStatus).toHaveBeenCalledTimes(2)
  })

  it('does not cache a failed account refresh and retries on the next navigation', async () => {
    mockAccountStore.currentAccount = { id: '100' }
    mockAccountStore.getUserAccounts
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ id: '100' }])

    await runMiddleware()
    expect(mockState.get('account-info-last-fetch')?.value).toBeNull()
    expect(mockAccountStore.getPendingApprovalCount).not.toHaveBeenCalled()

    await runMiddleware()
    expect(mockAccountStore.getUserAccounts).toHaveBeenCalledTimes(2)
    expect(mockAccountStore.getPendingApprovalCount).toHaveBeenCalledTimes(1)
  })

  it('clears a selected account when a successful refresh returns no accounts', async () => {
    mockAccountStore.currentAccount = { id: '100' }
    mockAccountStore.getUserAccounts.mockResolvedValue([])

    await runMiddleware()

    expect(mockAccountStore.userAccounts).toEqual([])
    expect(mockAccountStore.currentAccount.id).toBeUndefined()
    expect(mockState.get('account-info-last-fetch')?.value).toEqual({ userId: 'user-1', at: expect.any(Number) })
    expect(mockAccountStore.getPendingApprovalCount).not.toHaveBeenCalled()
  })

  it('refetches once the cache has expired', async () => {
    await runMiddleware()
    vi.advanceTimersByTime(5 * 60 * 1000)
    await runMiddleware()
    expect(mockAccountStore.getUserAccounts).toHaveBeenCalledTimes(2)
    expect(mockAccountStore.getPendingApprovalCount).toHaveBeenCalledTimes(2)
  })

  it('keeps user account data cached when the current account changes', async () => {
    mockAccountStore.getUserAccounts.mockResolvedValue([{ id: '100' }, { id: '200' }])
    await runMiddleware()
    mockAccountStore.currentAccount = { id: '200' }
    await runMiddleware()
    expect(mockAccountStore.getUserAccounts).toHaveBeenCalledTimes(1)
    expect(mockAccountStore.getPendingApprovalCount).toHaveBeenCalledTimes(1)
  })

  it('refetches when a different user is logged in', async () => {
    await runMiddleware()
    mockKcUser.value = { keycloakGuid: 'user-2' }
    await runMiddleware()
    expect(mockAccountStore.getUserAccounts).toHaveBeenCalledTimes(2)
    expect(mockAccountStore.getPendingApprovalCount).toHaveBeenLastCalledWith(100, 'user-2')
  })
})
