/**
 * Simulates document uploads via POST /documents.
 */
import http from 'k6/http'
import { check, group } from 'k6'
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js'
import { mockDocuments } from './mockDocuments.js'

const BASE_URL = __ENV.STRR_API_URL

const NUMBER_OF_CONCURRENT_USERS = 1
const ITERATIONS_PER_VU = 1 // run once per user, because each user will upload a set number of docs
const NUMBER_OF_SMALL_DOCS_PER_USER = 2
const NUMBER_OF_LARGE_DOCS_PER_USER = 3

// Options docs: https://grafana.com/docs/k6/latest/using-k6/k6-options/
export const options = {
  vus: NUMBER_OF_CONCURRENT_USERS, // number of virtual users to run concurrently
  iterations: NUMBER_OF_CONCURRENT_USERS * ITERATIONS_PER_VU // total iterations across all VUs combined

  // Thresholds docs: https://grafana.com/docs/k6/latest/using-k6/thresholds/
  // thresholds: {
  //   http_req_duration: ['p(95)<5000'], // 95% of requests must complete within 5s
  //   http_req_failed: ['rate<0.05'], // error rate must stay below 5%
  //   checks: ['rate>0.95'] // 95% of all checks must pass
  // }
}

export function setup () {
  const token = __ENV.ACCESS_TOKEN
  if (!token) {
    throw new Error('ACCESS_TOKEN is not set. Provide it in your .env file before running this script.')
  }
  return { token }
}

function buildHeaders (token) {
  return {
    'Account-Id': __ENV.ACCOUNT_ID,
    Authorization: `Bearer ${token}`
  }
}

function parseBody (res) {
  try { return JSON.parse(res.body) } catch { return null }
}

/**
 * Delete a previously uploaded document via DELETE /documents/{fileKey}.
 * Mirrors deleteDocument() in document.ts.
 *
 * @param {string} token
 * @param {string} fileKey
 */
function deleteDocument (token, fileKey) {
  const headers = buildHeaders(token)
  return http.del(`${BASE_URL}/documents/${fileKey}`, null, { headers })
}

/**
 * Upload a document to POST /documents.
 *
 * @param {string} token
 * @param {ArrayBuffer} fileContent - raw binary content of the file
 * @param {string} filename - file name sent in the multipart request
 * @param {string} mimeType - MIME type of the file
 * @param {string} documentType - STRR document type (e.g. 'COMBINED_BCSC_LICENSE')
 */
function uploadDocument (token, fileContent, filename, mimeType, documentType) {
  const headers = buildHeaders(token)
  const today = new Date().toISOString().split('T')[0]
  const formData = {
    file: http.file(fileContent, filename, mimeType),
    documentType,
    uploadStep: 'APPLICATION',
    uploadDate: today
  }
  return http.post(`${BASE_URL}/documents`, formData, { headers })
}

export default function (data) {
  const { token } = data

  // need to track fileKeys for uploaded documents so they could be removed after test runs
  const uploadedDocFileKeys = []

  try {
    group('No lost or corrupted files during upload', () => {
      const allDocs = [
        ...Array(NUMBER_OF_SMALL_DOCS_PER_USER).fill(mockDocuments.smallPdf),
        ...Array(NUMBER_OF_LARGE_DOCS_PER_USER).fill(mockDocuments.largePdf)
      ]
      for (let docIndex = 0; docIndex < allDocs.length; docIndex++) {
        const doc = allDocs[docIndex]
        const res = uploadDocument(token, doc.content(), doc.filename, doc.mimeType, doc.documentType)
        const body = parseBody(res)

        check(res, {
          'status is 200 or 201': r => r.status === 200 || r.status === 201
        })

        check(body, {
          'response body is not null': b => b !== null,
          'document fileKey is present': b => !!b?.fileKey,
          'document fileName matches uploaded filename': b => b?.fileName === doc.filename,
          'document fileName is present': b => !!b?.fileName,
          'document fileType is present': b => !!b?.fileType
        })

        const fileKey = body?.fileKey
        if (fileKey) {
          uploadedDocFileKeys.push(String(fileKey))
          // output fileKey in case it needs to be referenced outside of tests
          console.log(`Uploaded fileKey: ${fileKey}`)
        }
      }
    })
  } finally {
    // Cleanup — always runs, as the documents need to be deleted after tests
    group('Cleanup — delete uploaded documents', () => {
      for (const fileKey of uploadedDocFileKeys) {
        const res = deleteDocument(token, fileKey)
        check(res, {
          'document deleted successfully': r => r.status === 200 || r.status === 204 || r.status === 404
        })
      }
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
