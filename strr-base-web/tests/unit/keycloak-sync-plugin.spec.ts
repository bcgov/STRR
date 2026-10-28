import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockKeycloak = {
  authenticated: true,
  updateToken: vi.fn().mockResolvedValue(true)
}

vi.stubGlobal('defineNuxtPlugin', (plugin: unknown) => plugin)
vi.stubGlobal('useNuxtApp', () => ({
  $keycloak: mockKeycloak
}))

const { default: keycloakSyncPlugin } = await import('../../app/plugins/02.keycloak-sync.client')

describe('keycloak sync plugin', () => {
  let visibilityListener: (() => Promise<void>) | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    mockKeycloak.authenticated = true
    mockKeycloak.updateToken.mockResolvedValue(true)

    vi.spyOn(document, 'addEventListener').mockImplementation((event: string, handler: unknown) => {
      if (event === 'visibilitychange') {
        visibilityListener = handler as () => Promise<void>
      }
    })

    ;(keycloakSyncPlugin as unknown as () => void)()
  })

  it('registers a visibilitychange listener', () => {
    expect(visibilityListener).toBeDefined()
  })

  it('refreshes token when tab becomes visible and user is authenticated', async () => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    await visibilityListener?.()

    expect(mockKeycloak.updateToken).toHaveBeenCalledWith(120)
    expect(infoSpy).toHaveBeenCalledWith('[Auth] Tab focused: token refreshed successfully.')
  })

  it('logs info when token is still valid on tab focus', async () => {
    mockKeycloak.updateToken.mockResolvedValue(false)
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    await visibilityListener?.()

    expect(mockKeycloak.updateToken).toHaveBeenCalledWith(120)
    expect(infoSpy).toHaveBeenCalledWith('[Auth] Tab focused: token is still valid.')
  })

  it('does not refresh token when tab is hidden', async () => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    await visibilityListener?.()

    expect(mockKeycloak.updateToken).not.toHaveBeenCalled()
  })

  it('does not refresh token if user is not authenticated', async () => {
    mockKeycloak.authenticated = false
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await visibilityListener?.()

    expect(mockKeycloak.updateToken).not.toHaveBeenCalled()
  })

  it('handles updateToken rejection gracefully', async () => {
    mockKeycloak.updateToken.mockRejectedValue(new Error('Token refresh failed'))
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(visibilityListener?.()).resolves.not.toThrow()
    expect(consoleWarnSpy).toHaveBeenCalledWith('[Auth] Tab focused: failed to refresh token:', expect.any(Error))
  })
})

