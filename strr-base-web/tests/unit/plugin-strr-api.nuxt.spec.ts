import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import strrApiPlugin from '../../app/plugins/strr-api'

const { accountStore, keycloak, navigate, transport } = vi.hoisted(() => ({
  accountStore: { currentAccount: { id: 'test-account-1' } },
  keycloak: { token: 'synthetic-token-1' },
  navigate: vi.fn(),
  transport: vi.fn<typeof fetch>()
}))

mockNuxtImport('$fetch', async () => {
  const { createFetch } = await import('ofetch')
  return createFetch({ fetch: transport, Headers, AbortController })
})
mockNuxtImport('useConnectAccountStore', () => () => accountStore)
mockNuxtImport('useNuxtApp', original => () => Object.assign(Object.create(original()), { $keycloak: keycloak }))
mockNuxtImport('useRuntimeConfig', original => () => {
  const config = original()
  return { ...config, public: { ...config.public, strrApiURL: 'https://strr-api.test/api/v1' } }
})
mockNuxtImport('useLocalePath', () => () => (path: string) => `/en-CA${path}`)
mockNuxtImport('navigateTo', () => navigate)

async function createClient () {
  const result = await strrApiPlugin(useNuxtApp())
  return result!.provide!.strrApi
}

beforeEach(() => {
  accountStore.currentAccount = { id: 'test-account-1' }
  keycloak.token = 'synthetic-token-1'
  navigate.mockReset()
  transport.mockReset().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ applications: [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })))
})

describe('Shared STRR API client', () => {
  it.each([
    { name: 'omitted', headers: undefined },
    { name: 'object', headers: { 'X-Trace': 'trace-1', Authorization: 'stale', 'Account-Id': 'stale' } },
    { name: 'tuples', headers: [['X-Trace', 'trace-1'], ['Authorization', 'stale'], ['Account-Id', 'stale']] },
    { name: 'Headers', headers: new Headers({ 'X-Trace': 'trace-1', Authorization: 'stale', 'Account-Id': 'stale' }) }
  ] satisfies { name: string, headers: HeadersInit | undefined }[])(
    'authenticates requests with $name caller headers while preserving other headers', async ({ headers }) => {
      const client = await createClient()
      const originalHeaders = Array.from(new Headers(headers).entries())
      await expect(client('/applications', { headers })).resolves.toEqual({ applications: [] })

      const [url, options] = transport.mock.calls[0]!
      expect(url).toBe('https://strr-api.test/api/v1/applications')
      const sentHeaders = new Headers(options!.headers)
      expect(sentHeaders.get('Authorization')).toBe('Bearer synthetic-token-1')
      expect(sentHeaders.get('Account-Id')).toBe('test-account-1')
      expect(sentHeaders.get('X-Trace')).toBe(headers ? 'trace-1' : null)
      expect(Array.from(new Headers(headers).entries())).toEqual(originalHeaders)
      expect(navigate).not.toHaveBeenCalled()
    }
  )

  it('uses the current token and account after the client has been created', async () => {
    const client = await createClient()
    await client('/applications')
    keycloak.token = 'synthetic-token-2'
    accountStore.currentAccount = { id: 'test-account-2' }
    await client('/applications')

    const first = new Headers(transport.mock.calls[0]![1]!.headers)
    const second = new Headers(transport.mock.calls[1]![1]!.headers)
    expect(first.get('Authorization')).toBe('Bearer synthetic-token-1')
    expect(first.get('Account-Id')).toBe('test-account-1')
    expect(second.get('Authorization')).toBe('Bearer synthetic-token-2')
    expect(second.get('Account-Id')).toBe('test-account-2')
  })

  it.each([401, 403, 500])('preserves HTTP %i failures and redirects only unauthorized responses', async (status) => {
    transport.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ message: 'Request failed' }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    })))
    const client = await createClient()
    await expect(client('/applications', { retry: 0 })).rejects.toMatchObject({
      statusCode: status,
      data: { message: 'Request failed' }
    })
    expect(transport).toHaveBeenCalledTimes(1)
    if (status === 401) {
      expect(navigate).toHaveBeenCalledExactlyOnceWith('/en-CA/auth/login')
    } else {
      expect(navigate).not.toHaveBeenCalled()
    }
  })

  it('preserves network failures without redirecting to login', async () => {
    transport.mockRejectedValue(new TypeError('Network failure'))
    const client = await createClient()
    await expect(client('/applications', { retry: 0 })).rejects.toThrow('Network failure')
    expect(navigate).not.toHaveBeenCalled()
  })
})
