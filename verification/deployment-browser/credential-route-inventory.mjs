import { mkdir, writeFile } from 'node:fs/promises'

const raw = process.env.LEGACY_CYPRESS_USERS
const report = {
  runId: process.env.GITHUB_RUN_ID,
  harnessCommit: process.env.GITHUB_SHA,
  scope: 'Runner-only legacy credential configuration inventory. No login or network requests; no credential values or unknown type names emitted.',
  configured: Boolean(raw), parseable: false, array: false, routes: {}
}
let users
try {
  users = JSON.parse(raw || 'null')
  report.parseable = true
} catch {
  // Never log parser errors: they can contain part of the secret input.
}
report.array = Array.isArray(users)
if (report.array) {
  for (const type of ['default', 'bcsc', 'bceid']) {
    const entries = users.filter(item => item && item.type === type)
    const item = entries.length === 1 ? entries[0] : undefined
    report.routes[type] = {
      entries: entries.length,
      oneUsableEntry: Boolean(item && typeof item.username === 'string' && item.username.length &&
        typeof item.password === 'string' && item.password.length),
      otpConfigured: Boolean(item && typeof item.otpsecret === 'string' && item.otpsecret.length)
    }
  }
  report.unrecognizedEntries = users.filter(item => !item || !['default', 'bcsc', 'bceid'].includes(item.type)).length
}
await mkdir('results', { recursive: true })
const json = JSON.stringify(report, null, 2) + '\n'
await writeFile('results/credential-route-inventory.json', json)
console.log(json)
