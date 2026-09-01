import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// strr-base-web is extended as a local sibling layer (not a published package) -
// see nuxt.config.ts for why. The official CD deploy pipeline's Docker build
// context is scoped to this app's own directory only (bcgov/bcregistry-sre's
// Dockerfile-build does `COPY . /app` from whatever `gcloud builds submit` was
// invoked with, which frontend-cd.yaml scopes to just this app's
// working_directory) - strr-base-web is never uploaded alongside it there, by
// design. CI/local dev/the Cloud Build PR-preview channel all have the full
// repo checked out, so this is CD-pipeline-specific: fetch strr-base-web fresh
// from main when it's not there at all, matching what the old git-hosted
// `extends` layer reference used to do at build time regardless of local
// checkout contents.
//
// This has to run as a standalone `preinstall` script (before pnpm even
// resolves dependencies, well before nuxt.config.ts is loaded via
// `postinstall: nuxt prepare`) rather than inside nuxt.config.ts itself: jiti
// (nuxt.config.ts's loader) resolves import()s ahead of that file's own
// runtime code executing, so a dynamic import there can't depend on a fetch
// step run earlier in the same file.
//
// Fetches and extracts GitHub's tarball using only Node builtins (fetch,
// zlib, fs) rather than shelling out to `git`/`tar`/`curl`: the actual build
// image this runs in (an Alpine-based firebase-repo image) doesn't have git
// installed at all, and a bare `execSync('git ...')`/('tar ...') call would
// also trip SonarCloud typescript:S4036 (PATH-dependent command resolution).
const baseWebDir = resolve(dirname(fileURLToPath(import.meta.url)), '../strr-base-web')

if (!existsSync(baseWebDir)) {
  const res = await fetch('https://codeload.github.com/bcgov/STRR/tar.gz/refs/heads/main')
  if (!res.ok) {
    throw new Error(`Failed to fetch strr-base-web tarball: ${res.status} ${res.statusText}`)
  }
  const tar = gunzipSync(Buffer.from(await res.arrayBuffer()))

  // Minimal POSIX tar reader: just enough to pull out the strr-base-web/
  // subtree from a GitHub codeload archive (ustar headers + pax extended
  // headers for long paths, which is what git archive/GitHub both produce).
  let offset = 0
  let longPath = null
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512)
    if (header.every(byte => byte === 0)) {
      break
    }
    const readField = (start, length) => header.subarray(start, start + length).toString('utf-8').replace(/\0.*$/s, '').trim()
    const name = longPath ?? readField(0, 100)
    const size = parseInt(readField(124, 12) || '0', 8)
    const typeflag = String.fromCharCode(header[156])
    const contentStart = offset + 512
    const paddedSize = Math.ceil(size / 512) * 512
    longPath = null

    if (typeflag === 'x') {
      // pax extended header: lines like "<len> path=<value>\n"
      const pax = tar.subarray(contentStart, contentStart + size).toString('utf-8')
      const match = pax.match(/\d+ path=([^\n]+)\n/)
      if (match) {
        longPath = match[1]
      }
    } else if ((typeflag === '0' || typeflag === '\0') && name.includes('/strr-base-web/')) {
      const relativePath = name.slice(name.indexOf('/strr-base-web/') + '/strr-base-web/'.length)
      if (relativePath) {
        const destPath = join(baseWebDir, relativePath)
        mkdirSync(dirname(destPath), { recursive: true })
        writeFileSync(destPath, tar.subarray(contentStart, contentStart + size))
      }
    }

    offset = contentStart + paddedSize
  }

  if (!existsSync(baseWebDir)) {
    throw new Error('strr-base-web not found in the fetched bcgov/STRR tarball')
  }
}
