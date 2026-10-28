import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, watch } from 'vue'

const mockKeycloakInstance = {
  init: vi.fn().mockResolvedValue(true),
  updateToken: vi.fn().mockResolvedValue(true),
  isTokenExpired: vi.fn().mockReturnValue(false),
  logout: vi.fn(),
  authenticated: true,
  onTokenExpired: vi.fn()
}

vi.mock('keycloak-js', () => ({
  default: vi.fn(function () {
    return mockKeycloakInstance
  })
}))

const mockIdle = ref(false)
vi.stubGlobal('watch', watch)
vi.stubGlobal('defineNuxtPlugin', (plugin: unknown) => plugin)
vi.stubGlobal('useRuntimeConfig', () => ({
  public: {
    keycloakAuthUrl: 'https://keycloak.example.com',
    keycloakRealm: 'test-realm',
    keycloakClientId: 'test-client',
    tokenRefreshInterval: 30000,
    tokenMinValidity: 120000,
    sessionIdleTimeout: 1800000,
    sessionExpiredModalTimeout: 120000
  }
}))
vi.stubGlobal('useRoute', () => ({ meta: {} }))
vi.stubGlobal('useIdle', () => ({ idle: mockIdle }))
vi.stubGlobal('toValue', (val: unknown) => (typeof val === 'function' ? val() : val))
vi.stubGlobal('useConnectModals', () => ({
  openSessionExpiringModal: vi.fn()
}))
vi.stubGlobal('ConnectStorageKeys', {
  CONNECT_SESSION_EXPIRED: 'connect-session-expired'
})

const { default: keycloakPlugin } = await import('../../app/plugins/01.keycloak.client')

describe('01.keycloak.client plugin', () => {
  let visibilityListener: (() => Promise<void>) | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    mockIdle.value = false
    mockKeycloakInstance.authenticated = true
    mockKeycloakInstance.updateToken.mockResolvedValue(true)

    vi.spyOn(document, 'addEventListener').mockImplementation((event: string, handler: unknown) => {
      if (event === 'visibilitychange') {
        visibilityListener = handler as () => Promise<void>
      }
    })
  })

  it('initializes keycloak and provides keycloak instance', async () => {
    const result = await (keycloakPlugin as unknown as () => Promise<{ provide: { keycloak: unknown } }>)()
    expect(mockKeycloakInstance.init).toHaveBeenCalledWith({
      onLoad: 'check-sso',
      responseMode: 'query',
      pkceMethod: 'S256'
    })
    expect(result.provide.keycloak).toBe(mockKeycloakInstance)
  })

  it('refreshes token on tab focus if visible and authenticated', async () => {
    await (keycloakPlugin as unknown as () => Promise<unknown>)()
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    await visibilityListener?.()
    expect(mockKeycloakInstance.updateToken).toHaveBeenCalledWith(120)
    expect(infoSpy).toHaveBeenCalledWith('[Auth] Tab focused: token refreshed successfully.')
  })

  it('logs token still valid when updateToken returns false on tab focus', async () => {
    mockKeycloakInstance.updateToken.mockResolvedValue(false)
    await (keycloakPlugin as unknown as () => Promise<unknown>)()
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    await visibilityListener?.()
    expect(mockKeycloakInstance.updateToken).toHaveBeenCalledWith(120)
    expect(infoSpy).toHaveBeenCalledWith('[Auth] Tab focused: token is still valid.')
  })

  it('does not refresh token when tab is hidden or user unauthenticated', async () => {
    await (keycloakPlugin as unknown as () => Promise<unknown>)()
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })

    await visibilityListener?.()
    expect(mockKeycloakInstance.updateToken).not.toHaveBeenCalled()

    mockKeycloakInstance.authenticated = false
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await visibilityListener?.()
    expect(mockKeycloakInstance.updateToken).not.toHaveBeenCalled()
  })

  it('handles updateToken failure gracefully on tab focus', async () => {
    mockKeycloakInstance.updateToken.mockRejectedValue(new Error('Refresh failed'))
    await (keycloakPlugin as unknown as () => Promise<unknown>)()
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(visibilityListener?.()).resolves.not.toThrow()
    expect(warnSpy).toHaveBeenCalledWith('[Auth] Tab focused: failed to refresh token:', expect.any(Error))
  })
})
