import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { computed, defineComponent, h, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useConnectAccountStore } from '@daxiom/nuxt-core-layer-test/app/stores/connect-account'
import ChooseAccount from '~/pages/auth/account/choose-existing.vue'

const state = vi.hoisted(() => ({
  store: undefined as ReturnType<typeof useConnectAccountStore> | undefined,
  navigate: vi.fn(),
  navigationAccounts: [] as string[],
  renderErrors: [] as unknown[],
  query: {} as Record<string, string>,
  keycloak: {
    authenticated: false,
    tokenParsed: undefined as { loginSource: string; sub: string } | undefined
  }
}))

mockNuxtImport('useKeycloak', () => () => ({
  isAuthenticated: computed(() => state.keycloak.authenticated),
  kcUser: computed(() => ({ ...state.keycloak.tokenParsed, roles: [] })),
  login: vi.fn(),
  logout: vi.fn()
}))
mockNuxtImport('useConnectAccountStore', () => () => state.store)
mockNuxtImport('useRoute', original => () => ({ ...original(), query: state.query }))
mockNuxtImport('useLocalePath', () => () => (path: string) => `/en-CA${path}`)
mockNuxtImport('useRuntimeConfig', original => () => {
  const config = original()
  return { ...config, public: { ...config.public, authWebURL: 'https://auth.example.test/' } }
})
mockNuxtImport('navigateTo', () => (...args: unknown[]) => {
  state.navigationAccounts.push(state.store!.currentAccount.id)
  return state.navigate(...args)
})

enableAutoUnmount(afterEach)

beforeEach(async () => {
  state.keycloak.authenticated = false
  state.keycloak.tokenParsed = { loginSource: LoginSource.BCSC, sub: 'synthetic-user' }
  state.query = {}
  state.navigationAccounts = []
  state.renderErrors = []
  state.navigate.mockReset()
  await mountSuspended(defineComponent({
    setup () {
      state.store = useConnectAccountStore(createPinia())
      return () => h('div')
    }
  }))
  state.store!.userAccounts = ['101', '202'].map(id => ({
    id,
    label: `Synthetic account ${id}`,
    accountStatus: AccountStatus.ACTIVE,
    accountType: AccountType.BASIC,
    type: UserSettingsType.ACCOUNT
  }))
  state.store!.currentAccount = state.store!.userAccounts[0]!
  state.keycloak.authenticated = true
})

afterEach(() => {
  state.keycloak.authenticated = false
  state.store?.$dispose()
})

const mountPage = async () => {
  const wrapper = await mountSuspended(ChooseAccount, {
    global: {
      mocks: { $keycloak: state.keycloak },
      config: { errorHandler: error => state.renderErrors.push(error) }
    }
  })
  expect(state.renderErrors).toEqual([])
  return wrapper
}

describe('account selection session state', () => {
  it.each([
    { source: LoginSource.BCSC, href: '/en-CA/auth/account/create-new', target: '_self' },
    { source: LoginSource.BCEID, href: 'https://auth.example.test/setup-account', target: '_blank' }
  ])('uses the existing account creation route for $source', async ({ source, href, target }) => {
    state.keycloak.tokenParsed!.loginSource = source
    const wrapper = await mountPage()
    const create = wrapper.findAll('a').at(-1)!
    expect(create.attributes('href')).toBe(href)
    expect(create.attributes('target')).toBe(target)
  })

  it('renders the authentication destination when login claims are absent', async () => {
    state.keycloak.authenticated = false
    state.keycloak.tokenParsed = undefined
    const wrapper = await mountPage()
    expect(wrapper.findAll('a').at(-1)!.attributes('href'))
      .toBe('https://auth.example.test/choose-authentication-method')
  })

  it('can render again after the session claims have been cleared', async () => {
    const wrapper = await mountPage()
    state.keycloak.authenticated = false
    state.keycloak.tokenParsed = undefined
    wrapper.vm.$forceUpdate()
    await nextTick()
    expect(state.renderErrors).toEqual([])
    expect(wrapper.findAll('a').at(-1)!.attributes('href'))
      .toBe('https://auth.example.test/choose-authentication-method')
  })

  it.each([
    undefined, '/en-CA/application?from=account-selection'
  ])('switches before navigating to %s', async (returnTo) => {
    if (returnTo) { state.query.return = returnTo }
    const wrapper = await mountPage()
    await wrapper.findAll('[data-testid="choose-existing-account-button"]')[1]!.trigger('click')
    expect(state.store!.currentAccount.id).toBe('202')
    expect(state.navigationAccounts).toEqual(['202'])
    expect(state.navigate).toHaveBeenCalledExactlyOnceWith(returnTo ?? '/en-CA/dashboard')
  })

  it.each([AccountStatus.SUSPENDED, AccountStatus.NSF_SUSPENDED, AccountStatus.PENDING_STAFF_REVIEW])(
    'disables an account with status %s', async (status) => {
      state.store!.userAccounts[1]!.accountStatus = status
      const wrapper = await mountPage()
      const button = wrapper.findAll('[data-testid="choose-existing-account-button"]')[1]!
      expect((button.element as HTMLButtonElement).disabled).toBe(true)
      await button.trigger('click')
      expect(state.store!.currentAccount.id).toBe('101')
      expect(state.navigate).not.toHaveBeenCalled()
    }
  )

  it('keeps account creation available when there are no existing BCeID accounts', async () => {
    state.keycloak.tokenParsed!.loginSource = LoginSource.BCEID
    state.store!.userAccounts = []
    const wrapper = await mountPage()
    expect(wrapper.findAll('[data-testid="choose-existing-account-button"]')).toHaveLength(0)
    expect(wrapper.findAll('a').at(-1)!.attributes('href')).toBe('https://auth.example.test/setup-account')
  })
})
