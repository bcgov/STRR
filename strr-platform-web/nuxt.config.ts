// https://nuxt.com/docs/api/configuration/nuxt-config
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
    '/': { redirect: '/en-CA/platform/dashboard' }
  },

  modules: [
    '@nuxtjs/eslint-module',
    '@nuxt/test-utils/module',
    '@nuxt/image'
  ],

  extends: ['@daxiom/nuxt-core-layer-test'],

  imports: {
    dirs: ['stores', 'composables', 'enums', 'interfaces', 'types', 'utils']
  },

  css: [
    '@/assets/styles/layout.css'
  ],

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
      version: `STRR PM UI v${process.env.npm_package_version}`
      // set by layer - still required in .env
      // keycloakAuthUrl
      // keycloakClientId
      // keycloakRealm
      // authApiURL
      // authWebURL
      // registryHomeURL
      // ldClientId
      // appName - not required in .env
    }
  },

  vite: {
    optimizeDeps: { // optimize immediately instead of after visiting page, prevents page reload in dev when initially visiting a page with these deps
      include: ['zod', 'uuid', 'vitest']
    }
  },

  piniaPersistedstate: {
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
  // compatibilityDate: '2024-07-03' add compatibility date?
})
