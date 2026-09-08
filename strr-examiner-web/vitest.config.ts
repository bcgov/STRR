import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import path from 'path'
import { defineVitestConfig } from '@nuxt/test-utils/config'

const require = createRequire(import.meta.url)

// strr-base-web is extended as a local sibling layer, with its own fully
// separate node_modules - `resolve.dedupe` can't reconcile that with this
// app's own copy (dedupe only picks among candidates already reachable via
// this project's own resolution; strr-base-web's node_modules is a wholly
// separate, unrelated tree, not a nested/hoisted duplicate within it). A
// component resolved from inside it (e.g. via @daxiom/nuxt-core-layer-test)
// then pulls in a second, physically distinct copy of Vue's runtime, and
// mounting a tree that spans both crashes on Vue's internal per-instance
// checks ("Cannot read properties of null (reading 'ce')") since the two
// copies don't share module-level state. Force every resolution of these
// packages - regardless of which directory the importing file lives in - to
// this app's own copy via an explicit alias instead.
const vueAliases = Object.fromEntries(
  ['vue', '@vue/runtime-core', '@vue/runtime-dom', '@vue/reactivity', '@vue/shared']
    .map(pkg => [pkg, require.resolve(pkg)])
)

export default defineVitestConfig({
  resolve: {
    alias: {
      'keycloak-js': fileURLToPath(new URL('./tests/mocks/keycloak.ts', import.meta.url)),
      ...vueAliases
    }
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
