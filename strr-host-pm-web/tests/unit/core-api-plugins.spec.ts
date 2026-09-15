import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { createFetch } from 'ofetch'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import authPlugin from '@daxiom/nuxt-core-layer-test/app/plugins/auth-api'
import payPlugin from '@daxiom/nuxt-core-layer-test/app/plugins/pay-api'
import { $fetch, useNuxtApp, useAppConfig } from '#imports'

const state = vi.hoisted(() => ({
  apiKey: 'synthetic-api-key',
  account: { currentAccount: { id: 'account-one' } },
  keycloak: { authenticated: false, token: 'synthetic-token-one' },
  navigate: vi.fn()
}))

mockNuxtImport('useNuxtApp', original => () => Object.assign(Object.create(original()), {
  $keycloak: state.keycloak
}))
mockNuxtImport('useRuntimeConfig', original => () => {
  const config = original()
  return {
    ...config,
    public: {
      ...config.public,
      authApiURL: 'https://auth.example.invalid',
      payApiURL: 'https://pay.example.invalid',
      authApiKey: state.apiKey
    }
  }
})
mockNuxtImport('useConnectAccountStore', () => () => state.account)
mockNuxtImport('useLocalePath', () => () => (path: string) => `/en-CA${path}`)
mockNuxtImport('navigateTo', () => state.navigate)

enableAutoUnmount(afterEach)

describe('core API plugin request contracts', () => {
  let nuxtApp: ReturnType<typeof useNuxtApp>
  let config: ReturnType<typeof useAppConfig>
  const transport = vi.fn<typeof fetch>()

  beforeEach(async () => {
    state.apiKey = 'synthetic-api-key'
    state.account.currentAccount.id = 'account-one'
    state.keycloak.token = 'synthetic-token-one'
    state.navigate.mockReset().mockResolvedValue(undefined)
    transport.mockReset().mockImplementation(() => Promise.resolve(new Response('{"ok":true}', {
      status: 200, headers: { 'content-type': 'application/json' }
    })))
    await mountSuspended(defineComponent({
      setup () {
        nuxtApp = useNuxtApp()
        config = useAppConfig()
        return () => h('div')
      }
    }))
    const fetchClient = createFetch({ fetch: transport, Headers, AbortController })
    vi.spyOn($fetch, 'create').mockImplementation((...args) => fetchClient.create(...args))
  })

  afterEach(() => { vi.restoreAllMocks() })

  async function client (kind: 'auth' | 'pay') {
    if (kind === 'auth') {
      const result = await nuxtApp.runWithContext(() => authPlugin(nuxtApp))
      return result!.provide.authApi
    }
    const result = await nuxtApp.runWithContext(() => payPlugin(nuxtApp))
    return result!.provide.payApi
  }

  function sentHeaders (index = 0) {
    const headers = transport.mock.calls[index]![1]!.headers
    expect(headers).toBeInstanceOf(Headers)
    return headers as Headers
  }

  describe.each(['auth', 'pay'] as const)('%s API', (kind) => {
    it.each(['object', 'tuples', 'Headers'] as const)('preserves metadata with %s headers', async (format) => {
      const entries: [string, string][] = [['Authorization', 'old-token'], ['X-Request-Id', 'request-one']]
      const headers = format === 'object'
        ? Object.fromEntries(entries)
        : format === 'tuples'
          ? entries
          : new Headers(entries)
      const api = await client(kind)
      await expect(api('/resource', { headers })).resolves.toEqual({ ok: true })
      expect(transport.mock.calls[0]![0]).toBe(`https://${kind}.example.invalid/resource`)
      expect(sentHeaders().get('Authorization')).toBe('Bearer synthetic-token-one')
      expect(sentHeaders().get('X-Request-Id')).toBe('request-one')
      expect(sentHeaders().get('Account-Id')).toBe(kind === 'auth' ? 'account-one' : null)
      expect(sentHeaders().get('X-Apikey')).toBe(kind === 'auth' ? 'synthetic-api-key' : null)
    })

    it('adds authentication when callers supply no headers', async () => {
      const api = await client(kind)
      await api('/resource')
      expect(sentHeaders().get('Authorization')).toBe('Bearer synthetic-token-one')
    })

    it('uses the latest token and account on subsequent requests', async () => {
      const api = await client(kind)
      await api('/first')
      state.keycloak.token = 'synthetic-token-two'
      state.account.currentAccount.id = 'account-two'
      await api('/second')
      expect(sentHeaders(0).get('Authorization')).toBe('Bearer synthetic-token-one')
      expect(sentHeaders(1).get('Authorization')).toBe('Bearer synthetic-token-two')
      if (kind === 'auth') {
        expect(sentHeaders(0).get('Account-Id')).toBe('account-one')
        expect(sentHeaders(1).get('Account-Id')).toBe('account-two')
      }
    })

    it.each([401, 500])('preserves error behavior for HTTP %s', async (status) => {
      transport.mockImplementation(() => Promise.resolve(new Response('{}', {
        status, headers: { 'content-type': 'application/json' }
      })))
      const api = await client(kind)
      await expect(api('/resource', { retry: 0 })).rejects.toMatchObject({ status })
      if (status === 401) {
        const path = config.connect.core.plugin[kind === 'auth' ? 'authApi' : 'payApi'].errorRedirect[401]
        expect(state.navigate).toHaveBeenCalledExactlyOnceWith(`/en-CA${path}`)
      } else {
        expect(state.navigate).not.toHaveBeenCalled()
      }
    })
  })

  it('omits the optional API key when none is configured', async () => {
    state.apiKey = ''
    const api = await client('auth')
    await api('/resource')
    expect(sentHeaders().has('X-Apikey')).toBe(false)
    expect(sentHeaders().get('Account-Id')).toBe('account-one')
  })
})
