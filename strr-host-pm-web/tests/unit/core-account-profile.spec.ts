import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useConnectAccountStore } from '@daxiom/nuxt-core-layer-test/app/stores/connect-account'
import setupAccounts from '@daxiom/nuxt-core-layer-test/app/middleware/01.setup-accounts.global'
import { AccountStatus, AccountType, LoginSource, UserSettingsType, useNuxtApp, useRoute } from '#imports'

const testContext = vi.hoisted(() => ({
  authApi: vi.fn(),
  profile: vi.fn(),
  updateUser: vi.fn(),
  logError: vi.fn(),
  store: undefined as ReturnType<typeof useConnectAccountStore> | undefined,
  keycloak: {
    authenticated: false,
    token: 'synthetic-test-token',
    tokenParsed: {
      firstname: 'Session',
      lastname: 'Name',
      loginSource: 'BCEID',
      sub: 'synthetic-user',
      realm_access: { roles: [] }
    }
  }
}))

mockNuxtImport('useNuxtApp', original => () => Object.assign(Object.create(original()), {
  $authApi: testContext.authApi,
  $keycloak: testContext.keycloak
}))
mockNuxtImport('logFetchError', () => testContext.logError)
mockNuxtImport('useConnectAccountStore', () => () => testContext.store)

enableAutoUnmount(afterEach)

describe('core account profile recovery', () => {
  let store: ReturnType<typeof useConnectAccountStore>
  let nuxtApp: ReturnType<typeof useNuxtApp>
  let route: ReturnType<typeof useRoute>

  beforeEach(async () => {
    testContext.authApi.mockReset()
    testContext.profile.mockReset().mockResolvedValue({ firstName: 'Profile', lastName: 'Name' })
    testContext.updateUser.mockReset().mockResolvedValue({})
    testContext.logError.mockReset()
    testContext.keycloak.authenticated = false
    testContext.keycloak.tokenParsed.loginSource = LoginSource.BCEID
    testContext.authApi.mockImplementation((url: string) => {
      if (url === '/users') { return testContext.updateUser() }
      if (url === '/users/@me') { return testContext.profile() }
      if (url === '/users/synthetic-user/settings') {
        return Promise.resolve([{
          id: '123',
          label: 'Synthetic account',
          accountType: AccountType.BASIC,
          accountStatus: AccountStatus.ACTIVE,
          type: UserSettingsType.ACCOUNT
        }])
      }
      if (url === '/users/synthetic-user/org/123/notifications') { return Promise.resolve({ count: 3 }) }
      throw new Error(`Unexpected synthetic API request: ${url}`)
    })
    await mountSuspended(defineComponent({
      setup () {
        nuxtApp = useNuxtApp()
        route = useRoute()
        store = useConnectAccountStore(createPinia())
        testContext.store = store
        return () => h('div')
      }
    }))
  })

  afterEach(() => {
    testContext.keycloak.authenticated = false
    store.$dispose()
  })

  it('loads the available BCeID profile name', async () => {
    await store.setUserName()
    expect(store.userFullName).toBe('Profile Name')
    expect(testContext.authApi).toHaveBeenNthCalledWith(1, '/users', {
      method: 'POST', body: { isLogin: true }
    })
    expect(testContext.authApi).toHaveBeenNthCalledWith(2, '/users/@me', {
      headers: { Authorization: 'Bearer synthetic-test-token' }
    })
  })

  it('preserves the session name when the profile request fails', async () => {
    const failure = new Error('Synthetic profile service failure')
    testContext.profile.mockRejectedValue(failure)
    await expect(store.setUserName()).resolves.toBeUndefined()
    expect(store.userFullName).toBe('Session Name')
    expect(testContext.logError).toHaveBeenCalledWith(failure, 'Error fetching user info.')
  })

  it('preserves the session name when the profile response is empty', async () => {
    testContext.profile.mockResolvedValue(undefined)
    await expect(store.setUserName()).resolves.toBeUndefined()
    expect(store.userFullName).toBe('Session Name')
  })

  it('loads the profile name after a failed request is retried', async () => {
    testContext.profile.mockRejectedValueOnce(new Error('Synthetic profile service failure'))
    await store.setUserName()
    await store.setUserName()
    expect(store.userFullName).toBe('Profile Name')
  })

  it('retains the last loaded profile name through a temporary service failure', async () => {
    await store.setUserName()
    testContext.profile.mockRejectedValueOnce(new Error('Synthetic profile service failure'))
    await store.setUserName()
    expect(store.userFullName).toBe('Profile Name')
  })

  it.each([
    {}, { firstName: 'Partial' }, { lastName: 'Partial' }
  ])('preserves the session name for an incomplete profile %j', async (profile) => {
    testContext.profile.mockResolvedValue(profile)
    await store.setUserName()
    expect(store.userFullName).toBe('Session Name')
  })

  it.each([LoginSource.BCSC, LoginSource.IDIR])('uses the session name directly for %s', async (source) => {
    testContext.keycloak.tokenParsed.loginSource = source
    store.$dispose()
    store = nuxtApp.runWithContext(() => useConnectAccountStore(createPinia()))
    await store.setUserName()
    expect(store.userFullName).toBe('Session Name')
    expect(testContext.authApi).not.toHaveBeenCalled()
  })

  it('continues loading the profile after the user update request fails', async () => {
    const failure = new Error('Synthetic user update failure')
    testContext.updateUser.mockRejectedValue(failure)
    await store.setUserName()
    expect(store.userFullName).toBe('Profile Name')
    expect(testContext.logError).toHaveBeenCalledWith(failure, 'Error updating auth user info')
  })

  it('finishes account setup and pending approval loading after a profile failure', async () => {
    testContext.profile.mockRejectedValue(new Error('Synthetic profile service failure'))
    testContext.keycloak.authenticated = true
    await expect(nuxtApp.runWithContext(() => setupAccounts(route, route))).resolves.toBeUndefined()
    expect(store.currentAccount.id).toBe('123')
    expect(store.pendingApprovalCount).toBe(3)
    expect(store.userFullName).toBe('Session Name')
  })
})
