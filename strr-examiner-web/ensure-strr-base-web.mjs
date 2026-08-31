import { existsSync, cpSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { delimiter, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// strr-base-web is extended as a local sibling layer (not a published package) -
// see nuxt.config.ts for why. The official CD deploy pipeline's Docker build
// context is scoped to this app's own directory only (bcgov/bcregistry-sre's
// Dockerfile-build does `COPY . /app` from whatever `gcloud builds submit` was
// invoked with, which frontend-cd.yaml scopes to just this app's
// working_directory) - strr-base-web is never uploaded alongside it there, by
// design. CI/local dev/the Cloud Build PR-preview channel all have the full
// repo checked out, so this is CD-pipeline-specific: clone strr-base-web fresh
// from main when it's not there at all, matching what the old git-hosted
// `extends` layer reference used to do at build time regardless of local
// checkout contents.
//
// This has to run as a standalone `preinstall` script (before pnpm even
// resolves dependencies, well before nuxt.config.ts is loaded via
// `postinstall: nuxt prepare`) rather than inside nuxt.config.ts itself: jiti
// (nuxt.config.ts's loader) resolves import()s ahead of that file's own
// runtime code executing, so a dynamic import there can't depend on a clone
// step run earlier in the same file.
const baseWebDir = resolve(dirname(fileURLToPath(import.meta.url)), '../strr-base-web')

if (!existsSync(baseWebDir)) {
  // Resolve git's absolute path ourselves (rather than letting execFileSync's
  // OS-level PATH search find it) so this doesn't trip SonarCloud typescript:S4036.
  const gitBin = (process.env.PATH || '').split(delimiter)
    .map(dir => join(dir, process.platform === 'win32' ? 'git.exe' : 'git'))
    .find(existsSync)
  if (!gitBin) {
    throw new Error('git not found on PATH - required to fetch strr-base-web for this build context')
  }
  const cloneDir = resolve(baseWebDir, '..', '.strr-clone')
  execFileSync(gitBin, ['clone', '--depth', '1', 'https://github.com/bcgov/STRR.git', cloneDir], { stdio: 'inherit' })
  cpSync(resolve(cloneDir, 'strr-base-web'), baseWebDir, { recursive: true })
  rmSync(cloneDir, { recursive: true, force: true })
}
