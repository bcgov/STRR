import { describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { axiosRequestMocks, axiosDefaultMock } from '../utils/test-utils/mockedAxios'
import { testParsedToken, testUserSettings } from '../utils/test-utils/mockedData'
import { useBcrosAccount } from '@/stores/account'
import { useBcrosKeycloak } from '@/stores/keycloak'

describe('Account Store Tests', () => {
  let account: any
  let keycloak: any
  // TODO: TC - what is this one, hopefully auth api
  let apiURL: string

  // axios mocks
  vi.mock('axios', () => { return { default: { ...axiosDefaultMock } } })

  beforeEach(() => {
    setActivePinia(createPinia())
    keycloak = useBcrosKeycloak()
    // account uses kcUser which is based off this
    keycloak.kc.tokenParsed = testParsedToken

    account = useBcrosAccount()
    // for some reason these don't initialize properly
    account.user = computed(() => keycloak.kcUser)
    account.userFirstName = ref(account.user.firstName)
    account.userLastName = ref(account.user.lastName)

    apiURL = useRuntimeConfig().public.authApiURL
  })

  afterEach(() => vi.clearAllMocks())

  it('renders default state/getters as expected', () => {
    expect(account.currentAccount).toEqual({})
    expect(account.currentAccountName).toBe('')
    expect(account.user).toEqual(keycloak.kcUser)
    expect(account.userFirstName).toBe(testParsedToken.firstname)
    expect(account.userLastName).toBe(testParsedToken.lastname)
    expect(account.errors).toEqual([])
  })

  it('sets name values as expected when setUserName is called (BCSC)', () => {
    keycloak.kc.tokenParsed.loginSource = LoginSourceE.BCEID
    account.user.value = keycloak.kcUser
    expect(account.user.loginSource).toBe(LoginSourceE.BCEID)
    expect(axiosRequestMocks.get).not.toHaveBeenCalled()
  })

  it('sets account values as expected when setAccountInfo is called', async () => {
    expect(axiosRequestMocks.get).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(SessionStorageKeyE.CURRENT_ACCOUNT)).toBeNull()
    await account.setAccountInfo()
    expect(axiosRequestMocks.get).toHaveBeenCalled()
    expect(axiosRequestMocks.get).toHaveBeenCalledWith(`${apiURL}/users/${account.user.keycloakGuid}/settings`)
    expect(account.currentAccount).toEqual(testUserSettings[0])
    expect(sessionStorage.getItem(SessionStorageKeyE.CURRENT_ACCOUNT)).toBe(JSON.stringify(testUserSettings[0]))
    // test setting the current account to the 2nd value
    sessionStorage.setItem(SessionStorageKeyE.CURRENT_ACCOUNT, JSON.stringify(testUserSettings[1]))
    await account.setAccountInfo()
    expect(account.currentAccount).toEqual(testUserSettings[1])
  })

  // TODO: TC - add api calls to use mock data to
  // - get userAccounts to Account array
  // - add mailing address to each account
})
