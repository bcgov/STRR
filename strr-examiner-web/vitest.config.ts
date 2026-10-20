import { fileURLToPath } from 'node:url'
import os from 'node:os'
import path from 'path'
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  cacheDir: 'node_modules/.vite',
  resolve: {
    alias: {
      'bun:test': fileURLToPath(new URL('./vitest.config.ts', import.meta.url)),
      'keycloak-js': fileURLToPath(new URL('./tests/mocks/keycloak.ts', import.meta.url))
    }
  },
  test: {
    pool: 'threads',
    server: {
      deps: {
        inline: ['zod']
      }
    },
    maxWorkers: Math.max(2, Math.floor(os.cpus().length / 2)),
    environment: 'nuxt',
    dir: 'tests',
    coverage: {
      provider: 'v8',
      reportsDirectory: path.resolve(import.meta.dirname, 'tests/coverage'), // This ensures an absolute path,
      include: [
        'pages/**',
        'layouts/**',
        'components/**',
        'composables/**',
        'utils/**',
        'services/**',
        'plugins/**',
        'stores/**'
      ]
    },
    includeSource: ['../pages/index.vue'],
    environmentOptions: {
      nuxt: {
        rootDir: fileURLToPath(new URL('./', import.meta.url)),
        domEnvironment: 'happy-dom',
        overrides: {
          ssr: false,
          devtools: { enabled: false },
          telemetry: false,
          nitro: {
            prerender: { routes: [] }
          }
        }
      }
    },
    onConsoleLog (log: string) {
      if (
        log.includes('has already been registered in target app') ||
        log.includes('No launchdarkly sdk variable set') ||
        log.includes('<Suspense> is an experimental feature') ||
        log.includes('locale messages') ||
        log.includes('[NUXT_E1005]') ||
        log.includes('As of Tailwind CSS')
      ) {
        return false
      }
    },
    setupFiles: './tests/setup.ts',
    globals: true
  }
})
