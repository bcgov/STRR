import { ensureStrrBaseWebPrepared } from '../strr-base-web/prepare.mjs'

// strr-base-web is extended as a local sibling layer (not a published package),
// so its own generated .nuxt/tsconfig.json may not exist yet in a fresh checkout
// (e.g. CI, where only this app's own `nuxt prepare` runs). Without it, jiti fails
// to resolve strr-base-web/tsconfig.json's "extends" while evaluating its
// tailwind.config.ts, breaking the whole build. Prepare it eagerly if missing.
//
// strr-base-web itself is guaranteed to exist by this point: the official CD
// deploy pipeline's Docker build context is scoped to this app's own directory
// only, so a `preinstall` script (ensure-strr-base-web.mjs, run before pnpm
// even resolves dependencies, well before this file is loaded) clones it fresh
// from GitHub there if it's missing outright - see that file for why this
// can't live here instead (jiti pre-resolves import()s before any of this
// file's own runtime code executes, so a dynamic import can't depend on a
// clone step that only just ran a few lines above it).
ensureStrrBaseWebPrepared()

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  ssr: false,

  future: {
    compatibilityVersion: 4
  },

  modules: [
    '@nuxtjs/eslint-module',
    '@nuxt/test-utils/module',
    '@nuxt/image'
  ],

  i18n: {
    locales: [
      {
        name: 'English',
        code: 'en-CA',
        language: 'en-CA',
        dir: 'ltr',
        file: 'en-CA.ts'
      },
      {
        name: 'Français',
        code: 'fr-CA',
        language: 'fr-CA',
        dir: 'ltr',
        file: 'fr-CA.ts'
      }
    ],
    strategy: 'prefix',
    defaultLocale: 'en-CA'
  },

  extends: [
    '../strr-base-web',
    '@daxiom/nuxt-core-layer-test' // extend again, this prevents the payApi plugin error
  ],

  imports: {
    dirs: ['stores', 'composables', 'enums', 'interfaces', 'types', 'utils']
  },

  routeRules: {
    '/': { redirect: '/en-CA/dashboard' },
    '/en-CA': { redirect: '/en-CA/dashboard' },
    '/fr-CA': { redirect: '/fr-CA/dashboard' }
  },

  runtimeConfig: {
    public: {
      // Keys within public, will be also exposed to the client-side
      baseUrl: process.env.NUXT_BASE_URL,
      version: `STRR Host & Property Manager UI v${process.env.npm_package_version}`,
      housingLearnMoreUrl: process.env.NUXT_HOUSING_LEARN_MORE_URL,
      housingAllRulesUrl: process.env.NUXT_HOUSING_ALL_RULES_URL,
      housingRequiredDocsUrl: process.env.NUXT_HOUSING_REQUIRED_DOCS_URL,
      housingProofOfPrUrl: process.env.NUXT_HOUSING_PROOF_OF_PR_URL,
      hostTacUrl: process.env.NUXT_HOST_TAC_URL,
      hostAccActUrl: process.env.NUXT_HOST_ACC_ACT_SUMMARY,
      hostFeesUrl: process.env.NUXT_HOST_FEES_URL
      // set by strr-base-web layer (still required in .env)
      // addressCompleteKey - NUXT_ADDRESS_COMPLETE_KEY
      // payApiURL - NUXT_PAY_API_VERSION
      // legalApiURL - NUXT_LEGAL_API_VERSION
      // strrApiURL - NUXT_STRR_API_URL
      // paymentPortalUrl - NUXT_PAYMENT_PORTAL_URL
      // environment: NUXT_ENVIRONMENT_HEADER
      // set by connect layer (still required in .env)
      // keycloakAuthUrl - NUXT_KEYCLOAK_AUTH_URL
      // keycloakClientId - NUXT_KEYCLOAK_CLIENTID
      // keycloakRealm - NUXT_KEYCLOAK_REALM
      // authApiURL - NUXT_AUTH_API_URL
      // authWebURL - NUXT_AUTH_WEB_URL
      // registryHomeURL - NUXT_REGISTRY_HOME_URL
      // ldClientId - NUXT_LD_CLIENT_ID
      // appName - npm_package_name
    }
  },

  vite: {
    optimizeDeps: { // optimize immediately instead of after visiting page, prevents page reload in dev when initially visiting a page with these deps
      include: ['zod', 'uuid', 'vitest']
    },
    server: {
      watch: {
        usePolling: true
      }
    }
  }
})
