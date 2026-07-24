import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { defineConfig, devices } from '@playwright/test'

// manually build the path (workaround with node.js)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// App env then Playwright-only overrides (tests/e2e/.env)
dotenv.config({ path: path.resolve(__dirname, '.env') })
dotenv.config({ path: path.resolve(__dirname, 'tests/e2e/.env'), override: true })

const authStorageFile = `./tests/e2e/.auth/${
  process.env.PLAYWRIGHT_E2E_LOGIN?.toLowerCase() === 'bceid' ? 'bceid-user' : 'idir-user'
}.json`

const PLAYWRIGHT_VIDEO_MODES = ['on', 'off', 'retain-on-failure', 'on-first-retry'] as const
type PlaywrightVideoMode = (typeof PLAYWRIGHT_VIDEO_MODES)[number]

function resolvePlaywrightVideo (): PlaywrightVideoMode {
  const raw = process.env.PLAYWRIGHT_VIDEO?.toLowerCase().trim()
  if (raw && (PLAYWRIGHT_VIDEO_MODES as readonly string[]).includes(raw)) {
    return raw as PlaywrightVideoMode
  }
  return process.env.CI ? 'retain-on-failure' : 'on-first-retry'
}

export default defineConfig({
  testDir: './tests/e2e/', // Specifies the directory where your test files are located
  fullyParallel: true, // Run tests in parallel
  forbidOnly: !!process.env.CI, // Forbid `.only` in CI
  retries: process.env.CI ? 2 : 0, // Number of retries on CI
  workers: process.env.CI ? 1 : undefined, // Number of workers on CI
  reporter: 'line',
  globalSetup: './tests/e2e/test-utils/global-setup',
  use: {
    baseURL: process.env.NUXT_BASE_URL,
    trace: 'on-first-retry',
    video: resolvePlaywrightVideo(),
    storageState: authStorageFile // saved session from global-setup (idir or bceid per PLAYWRIGHT_E2E_LOGIN)
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ]
})
