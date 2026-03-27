/**
 * Stress tests the POST /permits/:validatePermit endpoint.
 * Each user targets a unique registration and validates its permit
 * against the correct address NUMBER_OF_VALIDATIONS times. All users run in parallel.
 *
 * Setup (runs once):
 *   1. Fetch exactly NUMBER_OF_REGISTRATIONS registrations with set status/type (eg. ACTIVE/HOST).
 *   2. Fail test if fewer than NUMBER_OF_REGISTRATIONS registrations are returned.
 *   3. Pass all registrations to the main test function.
 *
 * Main function:
 *   5. POST /permits/:validatePermit — validate each registration permit NUMBER_OF_VALIDATIONS times.
 */
import http from 'k6/http'
import { check, group } from 'k6'
import { Counter, Trend } from 'k6/metrics' // include additional metrics in the test summary
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js'

const BASE_URL = __ENV.STRR_API_URL

const NUMBER_OF_REGISTRATIONS = 10 // total number of registrations (and VUs) to test in parallel
const NUMBER_OF_VALIDATIONS = 10 // number of times each registration's permit is validated per VU
const REGISTRATIONS_STATUS = 'ACTIVE'
const REGISTRATIONS_TYPE = 'HOST'

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

// additional validation metrics - included in text summary report
const validationCount = new Counter('permit_validations_total') // total number of validation calls
const validationDuration = new Trend('permit_validation_duration', true) // response time of each validation

export function setup () {
  const token = __ENV.ACCESS_TOKEN
  if (!token) {
    throw new Error('ACCESS_TOKEN is not set. Provide it in your .env file before running this script.')
  }

  const headers = {
    Authorization: `Bearer ${token}`
  }

  const res = http.get(
    `${BASE_URL}/registrations/search?limit=${NUMBER_OF_REGISTRATIONS}&page=1` +
    `&status=${REGISTRATIONS_STATUS}&registrationType=${REGISTRATIONS_TYPE}`,
    { headers }
  )

  let body = null
  try { body = JSON.parse(res.body) } catch { /* check for errors below */ }

  if (res.status !== 200 || !body || !Array.isArray(body.registrations)) {
    throw new Error(`Failed to fetch registrations for setup (status ${res.status})`)
  }

  if (body.registrations.length < NUMBER_OF_REGISTRATIONS) {
    throw new Error(
      `Need at least ${NUMBER_OF_REGISTRATIONS} ${REGISTRATIONS_STATUS} ${REGISTRATIONS_TYPE} ` +
      `registration(s), found ${body.registrations.length}`
    )
  }

  // flatten registration details
  const registrations = body.registrations.map(r => ({
    registrationNumber: r.registrationNumber,
    streetNumber: r.unitAddress.streetNumber,
    postalCode: r.unitAddress.postalCode,
    unitNumber: r.unitAddress.unitNumber
  }))

  return { token, registrations }
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`
  }

  // to get unique reg's index, use built-in virtual user id (__VU is 1-based)
  const { registrationNumber, streetNumber, postalCode, unitNumber } = data.registrations[__VU - 1]

  // output registration number in case we need to reference it elsewhere (eg in UI)
  console.log('Validate Registration:', registrationNumber) // eslint-disable-line no-console

  const payload = JSON.stringify({
    identifier: registrationNumber,
    address: { streetNumber, postalCode, unitNumber }
  })

  // validate the permit NUMBER_OF_VALIDATIONS times — all against the correct address (happy path)
  for (let i = 0; i < NUMBER_OF_VALIDATIONS; i++) {
    const res = http.post(`${BASE_URL}/permits/:validatePermit`, payload, { headers })

    let body = null
    try { body = JSON.parse(res.body) } catch { /* check for errors below */ }

    group('Validation request is successful', () => {
      check(res, {
        'status is 200': r => r.status === 200
      })
    })

    group('Validation response is correct', () => {
      check(body, {
        'status is correct': b => b?.status === REGISTRATIONS_STATUS,
        'identifier is correct': b => b?.identifier === registrationNumber,
        'streetNumber is correct': b => b?.address?.streetNumber === streetNumber,
        'postalCode is correct': b => b?.address?.postalCode === postalCode,
        // only check if unitNumber exits in the registration
        ...(unitNumber && { 'unitNumber is correct': b => b?.address?.unitNumber === unitNumber }),
        // validUntil exists only for ACTIVE registrations
        ...(REGISTRATIONS_STATUS === 'ACTIVE' && { 'validUntil exists': b => !!b?.validUntil })
      })
    })

    validationCount.add(1)
    validationDuration.add(res.timings.duration)
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
