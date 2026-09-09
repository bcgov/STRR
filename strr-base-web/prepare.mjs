import { existsSync, readFileSync } from 'node:fs'
import { execSync, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'

// strr-base-web is extended as a local sibling layer (not a published package) by
// strr-examiner-web, strr-host-pm-web, strr-platform-web and strr-strata-web, so
// its own generated .nuxt/tsconfig.json may not exist yet in a fresh checkout
// (e.g. CI, where only one app's own `nuxt prepare` runs). Without it, jiti fails
// to resolve strr-base-web/tsconfig.json's "extends" while evaluating its
// tailwind.config.ts, breaking the whole build. Each consuming app's nuxt.config.ts
// calls ensureStrrBaseWebPrepared() to prepare it eagerly if missing - kept here,
// as a single shared module with no external dependencies of its own (safe to
// import even before this package's own node_modules exists), rather than
// duplicated in each app's own config.
//
// Both steps below invoke exact, pre-resolved absolute paths rather than
// shelling out to `npx pnpm`/`npx nuxi` by bare name, so resolution never
// depends on PATH (SonarCloud typescript:S4036).
export function ensureStrrBaseWebPrepared () {
  const baseWebDir = dirname(fileURLToPath(import.meta.url))
  if (!existsSync(resolve(baseWebDir, 'node_modules'))) {
    // corepack ships in the same directory as the running node binary itself, so
    // this resolves it without any PATH search, while still going through corepack
    // (rather than a fixed pnpm binary) so it honours this package's own pinned
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
}
