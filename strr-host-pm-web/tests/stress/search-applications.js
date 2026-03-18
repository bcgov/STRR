/**
 * Simulates searching applications via GET /applications with various filter combinations.
 */
import http from 'k6/http'
import { check, group } from 'k6'
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js'

const BASE_URL = __ENV.STRR_API_URL

const NUMBER_OF_CONCURRENT_USERS = 1

// Default params sent when the applications table is loaded/reset to defaults:
// status=FULL_REVIEW&sortBy=application_date&sortOrder=asc&address=&recordNumber=
// &assignee=&includeDraftRegistration=false&applicationsOnly=true
const DEFAULT_PARAMS = {
  status: ['FULL_REVIEW'],
  sortBy: 'application_date',
  sortOrder: 'asc',
  address: '',
  recordNumber: '',
  assignee: '',
  includeDraftRegistration: false,
  applicationsOnly: true
}

// Options docs: https://grafana.com/docs/k6/latest/using-k6/k6-options/
export const options = {
  vus: NUMBER_OF_CONCURRENT_USERS, // number of virtual users to run concurrently
  iterations: NUMBER_OF_CONCURRENT_USERS, // the total number of times the default function runs across all VUs combined

  // Thresholds docs: https://grafana.com/docs/k6/latest/using-k6/thresholds/
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests must complete within 3s
    http_req_failed: ['rate<0.05'], // error rate must stay below 5%
    checks: ['rate>0.99'] // 99% of all checks must pass
  }
}

export function setup () {
  const token = __ENV.ACCESS_TOKEN
  if (!token) {
    throw new Error('ACCESS_TOKEN is not set. Provide it in your .env file before running this script.')
  }
  return { token }
}

/**
 * Build a query string from a params object, supporting array values
 * by repeating the key (e.g. status=FULL_REVIEW&status=DRAFT).
 */
function buildQueryString (params) {
  const parts = []
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) { continue }
    if (Array.isArray(value)) {
      for (const v of value) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`)
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}

function searchApplications (token, params) {
  const headers = {
    'Account-Id': __ENV.IDIR_ACCOUNT_ID,
    Authorization: `Bearer ${token}`
  }
  const query = buildQueryString({
    limit: 50,
    page: 1,
    ...params
  })
  return http.get(`${BASE_URL}/applications${query}`, { headers })
}

function parseBody (res) {
  try { return JSON.parse(res.body) } catch { return null }
}

function checkSearchResponse (res, body) {
  check(res, {
    'status is 200': r => r.status === 200
  })
  check(body, {
    'response parses as JSON': b => b !== null,
    'applications array exists': b => Array.isArray(b?.applications),
    'total count exists': b => typeof b?.total === 'number'
  })
}

export default function (data) {
  const { token } = data

  // Baseline (default filters reset)

  group('Default search (default filters)', () => {
    const res = searchApplications(token, DEFAULT_PARAMS)
    const body = parseBody(res)
    checkSearchResponse(res, body)
  })

  // Status filter only searches

  group('Status filter — FULL_REVIEW', () => {
    const res = searchApplications(token, { status: ['FULL_REVIEW'], applicationsOnly: true })
    const body = parseBody(res)
    checkSearchResponse(res, body)
  })

  group('Status filter — DRAFT', () => {
    const res = searchApplications(token, { status: ['DRAFT'], applicationsOnly: true })
    const body = parseBody(res)
    checkSearchResponse(res, body)
  })

  // Text search on top of default params

  group('Text search — address', () => {
    const res = searchApplications(token, { ...DEFAULT_PARAMS, address: 'victoria' })
    const body = parseBody(res)
    checkSearchResponse(res, body)
  })

  group('Text search — application number (as text)', () => {
    const res = searchApplications(token, { ...DEFAULT_PARAMS, text: '31333398143962' })
    const body = parseBody(res)
    checkSearchResponse(res, body)
  })

  group('Application number search (as recordNumber)', () => {
    const res = searchApplications(token, { ...DEFAULT_PARAMS, recordNumber: '31333398143962' })
    const body = parseBody(res)
    checkSearchResponse(res, body)
  })

  // Toggle flags

  group('Exclude draft registrations', () => {
    const res = searchApplications(token, { ...DEFAULT_PARAMS, includeDraftRegistration: false })
    const body = parseBody(res)
    checkSearchResponse(res, body)
  })

  group('All applications (not applicationsOnly)', () => {
    const res = searchApplications(token, { ...DEFAULT_PARAMS, applicationsOnly: false })
    const body = parseBody(res)
    checkSearchResponse(res, body)
  })

  // sleep(1) // set time in seconds between test runs
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
