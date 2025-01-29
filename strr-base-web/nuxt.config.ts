// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'url'
// import { dirname, join } from 'path'

// const currentDir = dirname(fileURLToPath(import.meta.url))

// disable gtm if dev or test env or missing gtm id
const isTestOrDev = ['test', 'development'].includes((process.env.NUXT_ENVIRONMENT_HEADER || '').toLowerCase())
const isGtmIdEmpty = !(process.env.NUXT_GTM_ID?.trim() || '')
const isGtmEnabled = !(isTestOrDev || isGtmIdEmpty)

export default defineNuxtConfig({
  devtools: { enabled: false },
  ssr: false,

  future: {
    compatibilityVersion: 4
  },

  nitro: {
    prerender: {
      routes: []
    }
  },

  routeRules: {
    '/': { redirect: '/en-CA' }
  },

  modules: [
    '@nuxtjs/eslint-module',
    '@nuxt/test-utils/module',
    '@nuxt/image',
    '@zadigetvoltaire/nuxt-gtm',
    'nuxt-gtag'
  ],

  extends: ['@daxiom/nuxt-core-layer-test'],

  imports: {
    dirs: ['stores', 'composables', 'enums', 'interfaces', 'types', 'utils']
  },

  alias: {
    '#baseWeb': fileURLToPath(new URL('./app', import.meta.url))
  },

  css: [],

  app: {
    head: {
      link: [
        { rel: 'stylesheet', href: '/css/addresscomplete-2.50.min.css' }
      ],
      script: [
        { src: '/js/addresscomplete-2.50.min.js', type: 'text/javascript', defer: true }
      ]
    }
  },

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

  colorMode: {
    preference: 'light',
    fallback: 'light'
  },

  gtm: {
    enabled: isGtmEnabled,
    id: isGtmEnabled ? process.env.NUXT_GTM_ID?.trim() as string : 'GTM-UNDEFINED',
    debug: true,
    defer: true
  },

  gtag: {
    enabled: !!process.env.NUXT_GTAG_ID?.trim(),
    id: process.env.NUXT_GTAG_ID?.trim()
  },

  runtimeConfig: {
    public: {
      // Keys within public, will be also exposed to the client-side
      addressCompleteKey: process.env.NUXT_ADDRESS_COMPLETE_KEY,
      payApiURL: `${process.env.NUXT_PAY_API_URL}${process.env.NUXT_PAY_API_VERSION}`,
      legalApiURL: `${process.env.NUXT_LEGAL_API_URL}${process.env.NUXT_LEGAL_API_VERSION}`,
      strrApiURL: process.env.NUXT_STRR_API_URL,
      paymentPortalUrl: process.env.NUXT_PAYMENT_PORTAL_URL,
      baseUrl: process.env.NUXT_BASE_URL,
      environment: process.env.NUXT_ENVIRONMENT_HEADER || '',
      version: `STRR Base UI v${process.env.npm_package_version}`,
      housingStrrUrl: process.env.NUXT_REGISTRY_HOME_URL, // TODO: update to NUXT_HOUSING_STRR_URL once we get the housing strr url set
      declineTosRedirectUrl: process.env.NUXT_DECLINE_TOS_REDIRECT_URL,
      bcGovStrrUrl: process.env.NUXT_BCGOV_STRR_URL,
      genesysUrl: process.env.NUXT_GENESYS_URL,
      genesysEnvironmentKey: process.env.NUXT_GENESYS_ENVIRONMENT_KEY,
      genesysDeploymentKey: process.env.NUXT_GENESYS_DEPLOYMENT_KEY
      // set by layer - still required in .env
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
      include: ['zod', 'uuid', 'vitest', 'luxon', 'country-codes-list']
    }
  },

  piniaPluginPersistedstate: {
    storage: 'sessionStorage'
  },

  content: {
    locales: [
      'en-CA',
      'fr-CA'
    ],
    contentHead: false,
    markdown: {
      anchorLinks: false
    }
  }
})
