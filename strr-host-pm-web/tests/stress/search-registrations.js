/**
 * Simulates searching registrations via GET /registrations/search with various filter combinations.
 */
import http from 'k6/http'
import { check, group } from 'k6'
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js'

const BASE_URL = __ENV.STRR_API_URL

const NUMBER_OF_CONCURRENT_USERS = 1

// Default params sent when the registrations table is loaded/reset to defaults:
// status=ACTIVE&recordNumber=&approvalMethod=PROVISIONALLY_APPROVED
// &approvalMethod=PROVISIONAL_REVIEW&nocStatus=NOC_PENDING&reviewRenew=true
const DEFAULT_PARAMS = {
  status: ['ACTIVE'],
  recordNumber: '',
  approvalMethod: ['PROVISIONALLY_APPROVED', 'PROVISIONAL_REVIEW'],
  nocStatus: ['NOC_PENDING'],
  reviewRenew: true
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
 * by repeating the key (e.g. status=ACTIVE&status=SUSPENDED).
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

function searchRegistrations (token, params) {
  const headers = {
    'Account-Id': __ENV.IDIR_ACCOUNT_ID,
    Authorization: `Bearer ${token}`
  }
  const query = buildQueryString({
    sortOrder: 'asc',
    limit: 50,
    page: 1,
    ...params
  })
  return http.get(`${BASE_URL}/registrations/search${query}`, { headers })
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
    'registrations array exists': b => Array.isArray(b?.registrations),
    'total count exists': b => typeof b?.total === 'number'
  })
}

export default function (data) {
  const { token } = data

  // Baseline (default filters reset)

  group('Default search (default filters)', () => {
    const res = searchRegistrations(token, DEFAULT_PARAMS)
    const body = parseBody(res)
    checkSearchResponse(res, body)
  })

  // Text search on top of default params

  group('Text search — city name', () => {
    const res = searchRegistrations(token, { ...DEFAULT_PARAMS, text: 'vancouver' })
    const body = parseBody(res)
    checkSearchResponse(res, body)
  })

  group('Text search — first name', () => {
    const res = searchRegistrations(token, { ...DEFAULT_PARAMS, text: 'Delbert' })
    const body = parseBody(res)
    checkSearchResponse(res, body)
  })

  group('Text search — registration number', () => {
    const res = searchRegistrations(token, { ...DEFAULT_PARAMS, text: 'H768267365' })
    const body = parseBody(res)
    checkSearchResponse(res, body)
  })

  group('Text search — active only', () => {
    const res = searchRegistrations(token, { ...DEFAULT_PARAMS, status: ['ACTIVE'], text: 'vancouver' })
    const body = parseBody(res)
    checkSearchResponse(res, body)
    check(body, {
      'all results have ACTIVE status': b =>
        Array.isArray(b?.registrations) &&
        b.registrations.every(r => r?.status === 'ACTIVE')
    })
  })

  // Status filter only searches (no Find in registration...)

  group('Status filter — ACTIVE', () => {
    const res = searchRegistrations(token, { status: ['ACTIVE'] })
    const body = parseBody(res)
    checkSearchResponse(res, body)
    check(body, {
      'all results have ACTIVE status': b =>
        Array.isArray(b?.registrations) &&
        b.registrations.every(r => r?.status === 'ACTIVE')
    })
  })

  group('Approval method filter — AUTO_APPROVED', () => {
    const res = searchRegistrations(token, { approvalMethod: ['AUTO_APPROVED'] })
    const body = parseBody(res)
    checkSearchResponse(res, body)
  })

  group('NOC status filter — NOC_PENDING', () => {
    const res = searchRegistrations(token, { nocStatus: ['NOC_PENDING'] })
    const body = parseBody(res)
    checkSearchResponse(res, body)
  })

  group('Set-aside filter', () => {
    const res = searchRegistrations(token, { isSetAside: true })
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
