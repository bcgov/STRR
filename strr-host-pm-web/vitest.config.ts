import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import path from 'path'
import { defineVitestConfig } from '@nuxt/test-utils/config'
import { resolveVueAliases } from '../strr-base-web/vitest-vue-aliases.mjs'

// Forces every resolution of vue/@vue/* to this app's own copy, regardless of
// which directory the importing file lives in - see vitest-vue-aliases.mjs
// for why this is needed.
const vueAliases = resolveVueAliases(createRequire(import.meta.url))

export default defineVitestConfig({
  resolve: {
    alias: {
      'keycloak-js': fileURLToPath(new URL('./tests/mocks/keycloak.ts', import.meta.url)),
      ...vueAliases
    }
  },
  esbuild: {
    tsconfigRaw: '{}'
  },
  test: {
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
        // The 'nuxt' test environment runs its own internal Nuxt/Vite dev
        // server, which doesn't inherit the top-level `resolve.alias` above -
        // it needs to be set here too for it to actually take effect.
        overrides: {
          vite: {
            resolve: {
              alias: vueAliases
            }
          }
        }
        // mock: {
        //   indexedDb: true,
        // },
      }
    },
    setupFiles: './tests/setup.ts',
    globals: true
  }
})
