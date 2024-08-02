import { describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { axiosDefaultMock } from '../utils/test-utils/mockedAxios'
import { testParsedToken, testUserSettings } from '../utils/test-utils/mockedData'
import { useBcrosAuth } from '@/composables/useBcrosAuth'
import { useBcrosAccount } from '@/stores/account'
import { useBcrosKeycloak } from '@/stores/keycloak'

// todo: re-evaluate if fix or remove this test ticket #20310
describe('useBcrosAuth Tests', () => {
  it('placeholder test', () => {
    expect(true)
  })
  let account: any
  let keycloak: any
  const testToken = 'qjduwe'
  const testTokenRefresh = 'qjduwwewvwe'
  const testTokenId = '12322frwr'
  // axios mock
  vi.mock('axios', () => { return { default: { ...axiosDefaultMock } } })

  beforeEach(() => {
    setActivePinia(createPinia())
    keycloak = useBcrosKeycloak()
    keycloak.initKeyCloak = vi.fn().mockImplementation(() => {
      keycloak.kc.token = testToken
      keycloak.kc.idToken = testTokenId
      keycloak.kc.refreshToken = testTokenRefresh
      keycloak.kc.tokenParsed = testParsedToken
      keycloak.kc.isTokenExpired = vi.fn()
      keycloak.kc.authenticated = true
      return true
    })

    account = useBcrosAccount()
    account.setAccountInfo()
    // for some reason these don't initialize properly
    account.user = computed(() => keycloak.kcUser)
    account.userFirstName = ref(account.user.firstName)
    account.userLastName = ref(account.user.lastName)
  })

  afterEach(() => vi.clearAllMocks())

  it('auth setup flow works as expected', async () => {
    // verify setup
    expect(keycloak.kcUser).toEqual({})
    expect(account.user).toEqual({})
    const { setupAuth } = useBcrosAuth()
    // execute setupAuth
    await setupAuth({ url: 'kcurl', realm: 'realm', clientId: 'id' })
    // verify things are setup
    expect(keycloak.kc.tokenParsed).toEqual(testParsedToken)
    expect(keycloak.kcUser).not.toEqual({})
    expect(account.user).toEqual(keycloak.kcUser)
    expect(account.userAccounts.length).toBe(2)
    expect(account.currentAccount).toEqual(testUserSettings[0])
    expect(sessionStorage.getItem(SessionStorageKeyE.KEYCLOAK_TOKEN)).toBe(testToken)
    expect(sessionStorage.getItem(SessionStorageKeyE.KEYCLOAK_TOKEN_ID)).toBe(testTokenId)
    expect(sessionStorage.getItem(SessionStorageKeyE.KEYCLOAK_TOKEN_REFRESH)).toBe(testTokenRefresh)
    expect(sessionStorage.getItem(SessionStorageKeyE.KEYCLOAK_SYNCED)).toBe('true')
    expect(sessionStorage.getItem(SessionStorageKeyE.CURRENT_ACCOUNT)).toBe(JSON.stringify(testUserSettings[0]))
  })
})
