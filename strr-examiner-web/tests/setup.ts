import { vi } from 'vitest'
import { config } from '@vue/test-utils'
import { dataTestId } from './plugins/data-test-id'

vi.mock('keycloak-js', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      init: vi.fn().mockResolvedValue(true),
      login: vi.fn().mockResolvedValue(true),
      logout: vi.fn().mockResolvedValue(true),
      updateToken: vi.fn().mockResolvedValue(true),
      isTokenExpired: vi.fn().mockReturnValue(false),
      authenticated: true,
      token: 'mock-token',
      refreshToken: 'mock-refresh-token',
      idToken: 'mock-id-token',
      tokenParsed: {
        sub: 'mock-sub',
        loginSource: 'IDIR',
        realm_access: { roles: ['strr_examiner'] }
      }
    }))
  }
})

config.global.plugins.push(dataTestId)
