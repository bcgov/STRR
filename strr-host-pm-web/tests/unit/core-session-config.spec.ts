import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const settings = [
  ['tokenRefreshInterval', 'NUXT_KEYCLOAK_REFRESH_INTERVAL'],
  ['tokenMinValidity', 'NUXT_KEYCLOAK_MIN_TOKEN_VALIDITY'],
  ['sessionIdleTimeout', 'NUXT_CONNECT_SESSION_INACTIVITY_TIMEOUT'],
  ['sessionExpiredModalTimeout', 'NUXT_CONNECT_SESSION_MODAL_TIMEOUT']
] as const

const cases: { name: string, values: (string | undefined)[], expected: number[] }[] = [
  { name: 'unset values', values: [], expected: [30000, 120000, 1800000, 120000] },
  { name: 'empty values', values: ['', '', '', ''], expected: [30000, 120000, 1800000, 120000] },
  {
    name: 'example environment values',
    values: ['30000', '120000', '1800000', '120000'],
    expected: [30000, 120000, 1800000, 120000]
  },
  {
    name: 'custom millisecond values',
    values: ['15000', '45000', '600000', '90000'],
    expected: [15000, 45000, 600000, 90000]
  },
  { name: 'explicit zero values', values: ['0', '0', '0', '0'], expected: [0, 0, 0, 0] }
]

describe('core session runtime configuration', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('defineNuxtConfig', <T>(config: T) => config)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it.each(cases)('uses numeric milliseconds for $name', async ({ values, expected }) => {
    settings.forEach(([, env], index) => vi.stubEnv(env, values[index]))
    const { default: config } = await import('@daxiom/nuxt-core-layer-test/nuxt.config')

    expect(settings.map(([key]) => config.runtimeConfig?.public?.[key])).toEqual(expected)
  })
})
