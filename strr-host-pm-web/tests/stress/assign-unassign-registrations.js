/**
 * Stress tests the registration unassign/assign lifecycle via the API (for examiners).
 * Each user targets a unique registration, removes its assignee, then assigns it multiple
 * times — all users run in parallel to exercise concurrent load.
 *
 * Setup (runs once):
 *   1. Fetch set number/type of registrations from the API.
 *   2. Filter only those that already have an assignee (because first action is unassign).
 *   3. Fail test if fewer than NUMBER_OF_REGISTRATIONS registrations exist.
 *   4. Pass the first NUMBER_OF_REGISTRATIONS registration IDs to the main loop.
 *
 * Main function:
 *   5. All users start simultaneously — each targets a unique registration.
 *   6. Each user repeats NUMBER_OF_ASSIGN_EVENTS times:
 *      a. PUT /registrations/:id/unassign — all VUs fire in parallel.
 *      b. PUT /registrations/:id/assign   — all VUs fire in parallel, expects 200 + assignee info in the response body.
 */
import http from 'k6/http'
import { check, group } from 'k6'
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js'

const BASE_URL = __ENV.STRR_API_URL

const NUMBER_OF_REGISTRATIONS = 2 // total number of registrations (and VUs) to test in parallel
const NUMBER_OF_ASSIGN_EVENTS = 1 // number of times each registration is assigned over and over again
const REGISTRATIONS_TYPE = 'CANCELLED' // type of registrations to fetch for unassign/assign cycles

// Options docs: https://grafana.com/docs/k6/latest/using-k6/k6-options/
export const options = {
  vus: NUMBER_OF_REGISTRATIONS, // each VU handles one registration — all run in parallel
  iterations: NUMBER_OF_REGISTRATIONS, // total number of iterations (since it same as vus, user will run once)

  // Thresholds docs: https://grafana.com/docs/k6/latest/using-k6/thresholds/
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests must complete within 3s
    http_req_failed: ['rate<0.05'], // error rate must stay below 5%
    checks: ['rate>0.99'] // >99% of all checks must pass
  }
}

export function setup () {
  const token = __ENV.ACCESS_TOKEN
  if (!token) {
    throw new Error('ACCESS_TOKEN is not set. Provide it in your .env file before running this script.')
  }
  if (!__ENV.IDIR_ACCOUNT_ID) {
    throw new Error('IDIR_ACCOUNT_ID is not set. Provide it in your .env file before running this script.')
  }

  const headers = {
    'Account-Id': __ENV.IDIR_ACCOUNT_ID,
    Authorization: `Bearer ${token}`
  }

  const res = http.get(`${BASE_URL}/registrations/search?limit=50&status=${REGISTRATIONS_TYPE}`, { headers })

  let body = null
  try { body = JSON.parse(res.body) } catch { /* check for errors below */ }

  if (res.status !== 200 || !body || !Array.isArray(body.registrations)) {
    throw new Error(`Failed to fetch registrations for setup (status ${res.status})`)
  }

  const assigned = body.registrations.filter(r => !!r?.header?.assignee?.username)

  if (assigned.length < NUMBER_OF_REGISTRATIONS) {
    throw new Error(
      `Need at least ${NUMBER_OF_REGISTRATIONS} cancelled registrations with an assignee, found ${assigned.length}`
    )
  }

  const registrationIds = assigned.slice(0, NUMBER_OF_REGISTRATIONS).map(r => r.id)
  return { token, registrationIds }
}

export default function (data) {
  const headers = {
    'Account-Id': __ENV.IDIR_ACCOUNT_ID,
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`
  }

  // to get unique reg's index, use built-in virtual user id (__VU is 1-based)
  const registrationId = data.registrationIds[__VU - 1]

  // output reg id in case we need to reference it (eg verification in UI)
  console.log('Registration id:', registrationId) // eslint-disable-line no-console
  const url = `${BASE_URL}/registrations/${registrationId}`

  // unassign — all VUs fire this simultaneously (parallel, one per registration)
  const unassignResp = http.put(`${url}/unassign`, null, { headers })

  group('Unassign is successful', () => {
    check(unassignResp, {
      'status is 200': r => r.status === 200
    })
  })

  for (let i = 0; i < NUMBER_OF_ASSIGN_EVENTS; i++) {
    const assignResp = http.put(`${url}/assign`, null, { headers })

    let assignBody = null
    try { assignBody = JSON.parse(assignResp.body) } catch { /* check for errors below */ }

    group('Assign is successful and returns assignee info', () => {
      check(assignResp, {
        'status is 200': r => r.status === 200
      })
      check(assignBody, {
        'assignee username exists': b => !!b?.header?.assignee?.username,
        'assignee displayName exists': b => !!b?.header?.assignee?.displayName
      })
    })
  }
}

// Summary docs: https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/
export function handleSummary (data) {
  // data.metrics.checks is undefined if no checks ran at all
  const passes = data.metrics.checks?.values.passes ?? 0
  const fails = data.metrics.checks?.values.fails ?? 0
  const total = passes + fails
  const pct = total > 0 ? ((passes / total) * 100).toFixed(1) : '0.0'

  // overall result printed before the detailed breakdown
  const summary = `[${fails === 0 ? 'PASSED' : 'FAILED'}] ${passes}/${total} checks passed (${pct}%)\n`

  // textSummary reproduces k6's default output (groups, metrics, thresholds)
  const defaultSummary = textSummary(data, { indent: ' ', enableColors: true })

  return { stdout: summary + '\n' + defaultSummary }
}
