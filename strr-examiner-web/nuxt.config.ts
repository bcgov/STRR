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
        iso: 'en-CA',
        dir: 'ltr',
        file: 'en-CA.ts'
      },
      {
        name: 'Français',
        code: 'fr-CA',
        iso: 'fr-CA',
        dir: 'ltr',
        file: 'fr-CA.ts'
      }
    ],
    strategy: 'prefix',
    lazy: true,
    langDir: 'locales',
    defaultLocale: 'en-CA',
    detectBrowserLanguage: false,
    vueI18n: './i18n.config.ts'
  },

  extends: [
    ['github:bcgov/STRR/strr-base-web', { install: true }]
    // '../strr-base-web' // dev only
  ],

  imports: {
    dirs: ['stores', 'composables', 'enums', 'interfaces', 'utils', 'types']
  },

  routeRules: {
    '/': { redirect: '/en-CA/dashboard' },
    '/en-CA': { redirect: '/en-CA/dashboard' },
    '/fr-CA**': { redirect: '/en-CA/dashboard' }, // No French version yet – redirect all French routes to dashboard
    '/en-CA/examine': { redirect: '/en-CA/examine/startNew' }, // When navigating directly to examine, add 'startNew' as the slug
    '/en-CA/registration': { redirect: '/en-CA/dashboard' } // Redirect to dashboard when navigating directly to registration
  },

  runtimeConfig: {
    public: {
      // Keys within public, will be also exposed to the client-side
      baseUrl: process.env.NUXT_BASE_URL,
      version: `STRR Examiner UI v${process.env.npm_package_version}`
      // housingAllRulesUrl: process.env.NUXT_HOUSING_ALL_RULES_URL,
      // housingRequiredDocsUrl: process.env.NUXT_HOUSING_REQUIRED_DOCS_URL
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
