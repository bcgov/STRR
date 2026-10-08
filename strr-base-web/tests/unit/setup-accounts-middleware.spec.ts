import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, reactive } from 'vue'

const mockIsAuthenticated = ref(true)
const mockKcUser = ref({ keycloakGuid: 'user-1' })
const mockAccountStore = reactive({
  currentAccount: { id: '' },
  setAccountInfo: vi.fn(),
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
    mockAccountStore.setAccountInfo.mockImplementation(() => {
      mockAccountStore.currentAccount = { id: '100' }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does nothing when the user is not authenticated', async () => {
    mockIsAuthenticated.value = false
    await runMiddleware()
    expect(mockAccountStore.setAccountInfo).not.toHaveBeenCalled()
    expect(mockAccountStore.checkAccountStatus).not.toHaveBeenCalled()
  })

  it('fetches account info on the first navigation', async () => {
    await runMiddleware()
    expect(mockAccountStore.setAccountInfo).toHaveBeenCalledTimes(1)
    expect(mockAccountStore.setUserName).toHaveBeenCalledTimes(1)
    expect(mockAccountStore.checkAccountStatus).toHaveBeenCalledTimes(1)
    expect(mockAccountStore.getPendingApprovalCount).toHaveBeenCalledWith(100, 'user-1')
  })

  it('uses the cached account info on later navigations but still checks account status', async () => {
    await runMiddleware()
    await runMiddleware()
    expect(mockAccountStore.setAccountInfo).toHaveBeenCalledTimes(1)
    expect(mockAccountStore.getPendingApprovalCount).toHaveBeenCalledTimes(1)
    expect(mockAccountStore.checkAccountStatus).toHaveBeenCalledTimes(2)
  })

  it('refetches once the cache has expired', async () => {
    await runMiddleware()
    vi.advanceTimersByTime(5 * 60 * 1000)
    await runMiddleware()
    expect(mockAccountStore.setAccountInfo).toHaveBeenCalledTimes(2)
    expect(mockAccountStore.getPendingApprovalCount).toHaveBeenCalledTimes(2)
  })

  it('refetches when the current account changes', async () => {
    await runMiddleware()
    mockAccountStore.currentAccount = { id: '200' }
    mockAccountStore.setAccountInfo.mockImplementation(() => {})
    await runMiddleware()
    expect(mockAccountStore.setAccountInfo).toHaveBeenCalledTimes(2)
    expect(mockAccountStore.getPendingApprovalCount).toHaveBeenLastCalledWith(200, 'user-1')
  })

  it('refetches when a different user is logged in', async () => {
    await runMiddleware()
    mockKcUser.value = { keycloakGuid: 'user-2' }
    await runMiddleware()
    expect(mockAccountStore.setAccountInfo).toHaveBeenCalledTimes(2)
    expect(mockAccountStore.getPendingApprovalCount).toHaveBeenLastCalledWith(100, 'user-2')
  })
})
