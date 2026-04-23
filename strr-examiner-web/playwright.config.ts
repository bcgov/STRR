import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { defineConfig, devices } from '@playwright/test'

// manually build the path (workaround with node.js)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') })

export default defineConfig({
  testDir: './tests/e2e/', // Specifies the directory where your test files are located
  fullyParallel: true, // Run tests in parallel
  forbidOnly: !!process.env.CI, // Forbid `.only` in CI
  retries: process.env.CI ? 2 : 0, // Number of retries on CI
  workers: process.env.CI ? 1 : undefined, // Number of workers on CI
  reporter: 'html', // Use the 'html' reporter
  globalSetup: './tests/e2e/test-utils/global-setup',
  // automatically starts the dev server before tests and tears it down after
  webServer: {
    command: 'pnpm dev', // start the dev server before tests run
    url: process.env.NUXT_BASE_URL ?? 'http://localhost:3000',
    reuseExistingServer: !process.env.CI, // reuse dev server locally (start new one in CI)
    timeout: 120_000
  },
  use: {
    baseURL: process.env.NUXT_BASE_URL,
    trace: 'on-first-retry',
    storageState: './tests/e2e/.auth/idir-user.json' // load saved IDIR session so tests start pre-authenticated
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
