import { describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { testParsedToken } from '~/tests/mocks/mockData'
import { useBcrosKeycloak } from '@/stores/keycloak'

describe('Keycloak Store Tests', () => {
  let keycloak: any
  const testToken = 'qjduwe'
  const testTokenRefresh = 'qjduwwewvwe'
  const testTokenId = '12322frwr'
  const mockLogout = vi.fn().mockImplementation(() => { })

  beforeEach(() => {
    setActivePinia(createPinia())
    // set the kc element manually that would normally be initialized by keyckloak 3rd party service
    keycloak = useBcrosKeycloak()
    expect(keycloak.kc).toBeDefined()
    keycloak.kc.tokenParsed = testParsedToken
    keycloak.kc.token = testToken
    keycloak.kc.idToken = testTokenId
    keycloak.kc.refreshToken = testTokenRefresh
    // mock logout
    keycloak.kc.logout = mockLogout
  })

  it('renders getters as expected based on parsed token', () => {
    expect(keycloak.kcUser).toEqual({
      firstName: testParsedToken.firstname,
      lastName: testParsedToken.lastname,
      fullName: testParsedToken.name,
      userName: testParsedToken.username,
      email: testParsedToken.email,
      keycloakGuid: testParsedToken.sub,
      loginSource: testParsedToken.loginSource,
      roles: testParsedToken.realm_access.roles
    })
    expect(keycloak.kcUserKeycloakGuid).toBe(testParsedToken.sub)
    expect(keycloak.kcUserLoginSource).toBe(testParsedToken.loginSource)
    expect(keycloak.kcUserRoles).toEqual(testParsedToken.realm_access.roles)
  })

  it('syncs session storage as expected', () => {
    // verify test start
    expect(sessionStorage.getItem(SessionStorageKeyE.KEYCLOAK_TOKEN)).toBeNull()
    expect(sessionStorage.getItem(SessionStorageKeyE.KEYCLOAK_TOKEN_ID)).toBeNull()
    expect(sessionStorage.getItem(SessionStorageKeyE.KEYCLOAK_TOKEN_REFRESH)).toBeNull()
    expect(sessionStorage.getItem(SessionStorageKeyE.KEYCLOAK_SYNCED)).toBeNull()
    // sync session
    keycloak.syncSessionStorage()
    expect(sessionStorage.getItem(SessionStorageKeyE.KEYCLOAK_TOKEN)).toBe(testToken)
    expect(sessionStorage.getItem(SessionStorageKeyE.KEYCLOAK_TOKEN_ID)).toBe(testTokenId)
    expect(sessionStorage.getItem(SessionStorageKeyE.KEYCLOAK_TOKEN_REFRESH)).toBe(testTokenRefresh)
    expect(sessionStorage.getItem(SessionStorageKeyE.KEYCLOAK_SYNCED)).toBe('true')
  })

  it('does expected workflow on logout', async () => {
    // TODO: TC - this seems wrong
    const logoutUrl = 'http://logout'
    // setup
    keycloak.syncSessionStorage()
    expect(mockLogout).toBeCalledTimes(0)
    // logout
    await keycloak.logout(logoutUrl)
    // check keycloak logout was called with redirec
    expect(mockLogout).toBeCalledTimes(1)
    expect(mockLogout).toBeCalledWith({ redirectUri: logoutUrl })
    // check session was cleared
    expect(sessionStorage.getItem(SessionStorageKeyE.KEYCLOAK_TOKEN)).toBeNull()
    expect(sessionStorage.getItem(SessionStorageKeyE.KEYCLOAK_TOKEN_ID)).toBeNull()
    expect(sessionStorage.getItem(SessionStorageKeyE.KEYCLOAK_TOKEN_REFRESH)).toBeNull()
    expect(sessionStorage.getItem(SessionStorageKeyE.KEYCLOAK_SYNCED)).toBeNull()
  })
})
