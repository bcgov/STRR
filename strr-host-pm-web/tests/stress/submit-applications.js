/**
 * Submits a POST /applications request with a mock STRR host registration payload.
 */
import http from 'k6/http'
import { check } from 'k6'
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

  check(res, {
    'status is 200 or 201': r => r.status === 200 || r.status === 201,
    'applicationNumber exists': (r) => {
      try { return !!JSON.parse(r.body)?.header?.applicationNumber } catch { return false }
    },
    'response has header.status': (r) => {
      try { return !!JSON.parse(r.body)?.header?.status } catch { return false }
    },
    'registrationType is HOST': (r) => {
      try { return JSON.parse(r.body)?.registration?.registrationType === 'HOST' } catch { return false }
    }
  })

  // sleep(1) // set time in seconds between test runs
}
