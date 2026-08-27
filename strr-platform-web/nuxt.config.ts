import { existsSync, readFileSync } from 'node:fs'
import { execSync, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'

// strr-base-web is extended as a local sibling layer (not a published package),
// so its own generated .nuxt/tsconfig.json may not exist yet in a fresh checkout
// (e.g. CI, where only this app's own `nuxt prepare` runs). Without it, jiti fails
// to resolve strr-base-web/tsconfig.json's "extends" while evaluating its
// tailwind.config.ts, breaking the whole build. Prepare it eagerly if missing.
//
// Both steps below invoke exact, pre-resolved absolute paths rather than
// shelling out to `npx pnpm`/`npx nuxi` by bare name, so resolution never
// depends on PATH (SonarCloud typescript:S4036).
const __dirname = dirname(fileURLToPath(import.meta.url))
const baseWebDir = resolve(__dirname, '../strr-base-web')
if (!existsSync(resolve(baseWebDir, 'node_modules'))) {
  // corepack ships in the same directory as the running node binary itself, so
  // this resolves it without any PATH search, while still going through corepack
  // (rather than a fixed pnpm binary) so it honours baseWebDir's own pinned
  // packageManager version, same as the original `npx pnpm` invocation did.
  const corepackBin = resolve(dirname(process.execPath), process.platform === 'win32' ? 'corepack.cmd' : 'corepack')
  // execSync (not execFileSync) here since corepack.cmd is a batch file that
  // needs shell interpretation to run on Windows; the command name itself is
  // still an absolute, quoted path rather than a bare "npx"/"pnpm" lookup.
  execSync(`"${corepackBin}" pnpm install --ignore-scripts`, { cwd: baseWebDir, stdio: 'inherit' })
}
if (!existsSync(resolve(baseWebDir, '.nuxt/tsconfig.json'))) {
  // nuxt's own "bin" field (which its package.json "exports" map deliberately
  // doesn't expose as an importable subpath) is how pnpm's own nuxi shim finds
  // this same file - read it the same way instead of guessing the path.
  const nuxtPkgPath = createRequire(import.meta.url).resolve('nuxt/package.json', { paths: [baseWebDir] })
  const nuxtPkg = JSON.parse(readFileSync(nuxtPkgPath, 'utf-8'))
  const nuxtBin = resolve(dirname(nuxtPkgPath), nuxtPkg.bin.nuxi)
  execFileSync(process.execPath, [nuxtBin, 'prepare'], { cwd: baseWebDir, stdio: 'inherit' })
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  ssr: false,

  future: {
    compatibilityVersion: 4
  },

  routeRules: {
    '/': { redirect: '/en-CA/platform/dashboard' },
    '/en-CA': { redirect: '/en-CA/platform/dashboard' },
    '/fr-CA': { redirect: '/fr-CA/platform/dashboard' }
  },

  modules: [
    '@nuxtjs/eslint-module',
    '@nuxt/test-utils/module',
    '@nuxt/image'
  ],

  extends: [
    '../strr-base-web',
    '@daxiom/nuxt-core-layer-test' // extend again, this prevents the payApi plugin error
  ],

  imports: {
    dirs: ['stores', 'composables', 'enums', 'interfaces', 'types', 'utils']
  },

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

  runtimeConfig: {
    public: {
      // Keys within public, will be also exposed to the client-side
      baseUrl: process.env.NUXT_BASE_URL,
      version: `STRR Platform UI v${process.env.npm_package_version}`,
      platformsTacUrl: process.env.NUXT_PLATFORMS_TAC_URL,
      platformsLearnMoreUrl: process.env.NUXT_PLATFORMS_LEARN_MORE_URL
      // -- set by strr-base-web layer (still required in .env)
      // addressCompleteKey - NUXT_ADDRESS_COMPLETE_KEY
      // payApiURL - NUXT_PAY_API_VERSION
      // legalApiURL - NUXT_LEGAL_API_VERSION
      // strrApiURL - NUXT_STRR_API_URL
      // paymentPortalUrl - NUXT_PAYMENT_PORTAL_URL
      // environment: NUXT_ENVIRONMENT_HEADER
      // -- set by connect layer (still required in .env)
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
    }
  }
})
