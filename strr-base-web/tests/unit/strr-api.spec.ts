import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockKeycloak = {
  authenticated: true,
  token: 'mock-token',
  updateToken: vi.fn().mockResolvedValue(true)
}

const mockAccountStore = {
  currentAccount: { id: 'test-account-123' }
}

let capturedFetchOptions: any = null

vi.stubGlobal('defineNuxtPlugin', (plugin: unknown) => plugin)
vi.stubGlobal('useRuntimeConfig', () => ({
  public: { strrApiURL: 'https://api.test' }
}))
vi.stubGlobal('useConnectAccountStore', () => mockAccountStore)
vi.stubGlobal('useLocalePath', () => (path: string) => path)
vi.stubGlobal('useNuxtApp', () => ({
  $keycloak: mockKeycloak
}))
const mockNavigateTo = vi.fn()
vi.stubGlobal('navigateTo', mockNavigateTo)
vi.stubGlobal('$fetch', {
  create: vi.fn((opts) => {
    capturedFetchOptions = opts
    return vi.fn()
  })
})

const { default: strrApiPlugin } = await import('../../app/plugins/strr-api')

describe('strrApi plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKeycloak.authenticated = true
    mockKeycloak.token = 'mock-token'
    mockKeycloak.updateToken.mockResolvedValue(true)
    capturedFetchOptions = null
    ;(strrApiPlugin as unknown as () => void)()
  })

  it('configures $fetch with onRequest and onResponseError', () => {
    expect(capturedFetchOptions).toBeDefined()
    expect(capturedFetchOptions.baseURL).toBe('https://api.test')
    expect(typeof capturedFetchOptions.onRequest).toBe('function')
    expect(typeof capturedFetchOptions.onResponseError).toBe('function')
  })

  it('pre-flight refreshes token when authenticated and sets auth headers', async () => {
    const options: any = { headers: {} }
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    await capturedFetchOptions.onRequest({ options })

    expect(mockKeycloak.updateToken).toHaveBeenCalledWith(60)
    expect(infoSpy).toHaveBeenCalledWith('[Auth] Access token refreshed before API request.')
    expect(options.headers.Authorization).toBe('Bearer mock-token')
    expect(options.headers['Account-Id']).toBe('test-account-123')
  })

  it('does not refresh token when not authenticated', async () => {
    mockKeycloak.authenticated = false
    const options: any = { headers: {} }

    await capturedFetchOptions.onRequest({ options })

    expect(mockKeycloak.updateToken).not.toHaveBeenCalled()
  })

  it('handles updateToken failure gracefully without aborting request headers setup', async () => {
    mockKeycloak.updateToken.mockRejectedValue(new Error('Network error during refresh'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const options: any = { headers: {} }

    await expect(capturedFetchOptions.onRequest({ options })).resolves.not.toThrow()

    expect(warnSpy).toHaveBeenCalledWith('[Auth] Failed to refresh token before API request:', expect.any(Error))
    expect(options.headers.Authorization).toBe('Bearer mock-token')
    expect(options.headers['Account-Id']).toBe('test-account-123')
  })

  it('supports array format headers', async () => {
    const options: any = { headers: [] }
    await capturedFetchOptions.onRequest({ options })

    expect(options.headers).toContainEqual(['Authorization', 'Bearer mock-token'])
    expect(options.headers).toContainEqual(['Account-Id', 'test-account-123'])
  })

  it('supports Headers instance format headers', async () => {
    const headers = new Headers()
    const options: any = { headers }
    await capturedFetchOptions.onRequest({ options })

    expect(headers.get('Authorization')).toBe('Bearer mock-token')
    expect(headers.get('Account-Id')).toBe('test-account-123')
  })

  it('redirects to /auth/login on 401 response error', async () => {
    await capturedFetchOptions.onResponseError({ response: { status: 401 } })
    expect(mockNavigateTo).toHaveBeenCalledWith('/auth/login')
  })

  it('does not redirect on non-401 response error', async () => {
    await capturedFetchOptions.onResponseError({ response: { status: 500 } })
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })
})
