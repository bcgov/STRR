import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

let loaded = false

/** Root `.env` (Nuxt / shared URLs) then `tests/e2e/.env` (Playwright-only; overrides). */
export function loadPlaywrightEnv (): void {
  if (loaded) {
    return
  }
  loaded = true
  const here = path.dirname(fileURLToPath(import.meta.url))
  const projectRoot = path.resolve(here, '..', '..', '..')
  config({ path: path.join(projectRoot, '.env') })
  config({ path: path.join(projectRoot, 'tests/e2e/.env'), override: true })
}
