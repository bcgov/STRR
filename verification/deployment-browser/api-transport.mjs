import { expect } from '@playwright/test'

// Observe actual app requests. Never export tokens, keys, account IDs or response bodies.
export function observeApiTransport(page, result, environment) {
  if (!['dev', 'test'].includes(environment)) throw new Error('Only DEV and TEST are allowed')
  const checks = result.apiTransport = { requests: [], result: 'in_progress' }
  const pending = []
  page.on('response', response => {
    const request = response.request()
    if (request.method() !== 'GET') return
    const url = new URL(response.url())
    let category
    if (url.hostname.startsWith(`auth-api-${environment}-`)) category = 'auth'
    if (url.hostname.startsWith(`strr-api-${environment}-`) && ['/applications', '/registrations', '/registrations/user/search'].includes(url.pathname)) category = 'strr-list'
    if (url.hostname.startsWith(`pay-api-${environment}-`) && /^\/api\/v1\/accounts\/[^/]+\/?$/.test(url.pathname)) category = 'pay-account'
    if (url.hostname.startsWith(`pay-api-${environment}-`) && url.pathname.startsWith('/api/v1/fees/STRR/')) category = 'pay-fee'
    if (!category) return
    pending.push(request.allHeaders().then(headers => {
      checks.requests.push({
        category, status: response.status(),
        bearerPresent: /^Bearer\s+\S+$/.test(headers.authorization || ''),
        accountPresent: Boolean(headers['account-id'] && !['undefined', 'null'].includes(headers['account-id'])),
        apiKeyPresent: Boolean(headers['x-apikey'])
      })
    }).catch(() => { checks.headerObservationFailed = true }))
  })
  return async () => {
    await Promise.all(pending)
    expect(checks.headerObservationFailed).not.toBe(true)
    for (const category of ['auth', 'strr-list', 'pay-account', 'pay-fee']) {
      result.stage = `api-transport-${category}`
      const successful = checks.requests.filter(item => item.category === category && item.status === 200 && item.bearerPresent)
      expect(successful.length).toBeGreaterThan(0)
      if (category === 'strr-list') expect(successful.some(item => item.accountPresent)).toBe(true)
    }
    checks.result = 'passed'
  }
}
