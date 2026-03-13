/**
 * Submits a POST /applications request with a mock STRR host registration payload.
 */
import http from 'k6/http'
import { check, group } from 'k6'
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js'
import { mockSubmitApplication } from './mockPayloads.js'

const BASE_URL = __ENV.STRR_API_URL

const NUMBER_OF_CONCURRENT_USERS = 1

// Options docs: https://grafana.com/docs/k6/latest/using-k6/k6-options/
export const options = {
  vus: NUMBER_OF_CONCURRENT_USERS, // number of virtual users to run concurrently
  iterations: NUMBER_OF_CONCURRENT_USERS // the total number of times the default function runs across all VUs combined

  // Thresholds docs: https://grafana.com/docs/k6/latest/using-k6/thresholds/
  // thresholds: {
  //   // 'http_req_duration{url:POST /applications}': ['p(95)<3000', 'p(99)<5000'],
  //   http_req_duration: ['p(95)<3000'], // 95% of requests must complete within 3s
  //   http_req_failed: ['rate<0.05'], // error rate must stay below 5%
  //   checks: ['rate>0.99'] // >99% of all checks must pass
  // }
}

const payload = JSON.stringify(mockSubmitApplication)

// Track applicationNumbers submitted by the user to detect duplicates across the iterations,
// because k6 virtual users run in isolated runtimes, so this does not catch cross-vu duplicates.
const submittedApplicationNumbers = new Set()

export function setup () {
  const token = __ENV.ACCESS_TOKEN
  if (!token) {
    throw new Error('ACCESS_TOKEN is not set. Provide it in your .env file before running this script.')
  }
  return { token }
}

export default function (data) {
  const headers = {
    'Account-Id': __ENV.ACCOUNT_ID,
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`
  }

  const res = http.post(`${BASE_URL}/applications`, payload, { headers })

  let body = null
  try { body = JSON.parse(res.body) } catch { /* handled by checks below */ }

  group('Application created successfully', () => {
    check(res, {
      'status is 200 or 201': r => r.status === 200 || r.status === 201
    })
    check(body, {
      'header.applicationNumber exists': b => !!b?.header?.applicationNumber,
      'header.status exists': b => !!b?.header?.status
    })
  })

  group('No duplicate application numbers', () => {
    const appNumber = body?.header?.applicationNumber
    check({ appNumber, submitted: submittedApplicationNumbers }, {
      'applicationNumber is unique': ({ appNumber, submitted }) => {
        if (!appNumber) { return false }
        const isDuplicate = submitted.has(appNumber)
        submitted.add(appNumber)
        return !isDuplicate
      }
    })
  })

  group('No partial or corrupted records', () => {
    check(body?.registration, {
      'registration exists': r => !!r,
      'registration.primaryContact exists': r => !!r?.primaryContact,
      'registration.unitAddress exists': r => !!r?.unitAddress,
      'registration.unitDetails exists': r => !!r?.unitDetails,
      'registration.strRequirements exists': r => !!r?.strRequirements
    })
  })

  group('Business rules applied', () => {
    const submitted = mockSubmitApplication.registration
    check(body?.registration, {
      'registrationType match submitted value': r => r?.registrationType === submitted.registrationType,
      'pr requirements match submitted value': r =>
        r?.strRequirements?.isPrincipalResidenceRequired === submitted.strRequirements.isPrincipalResidenceRequired,
      'propertyType match submitted value': r =>
        r?.unitDetails?.propertyType === submitted.unitDetails.propertyType,
      'ownershipType match submitted value': r =>
        r?.unitDetails?.ownershipType === submitted.unitDetails.ownershipType
    })
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
