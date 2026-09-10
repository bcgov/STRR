import { describe, expect, it } from 'vitest'
import { buildLoginRedirectUrl, getDirectLoginIdp, parseLoginIdp } from '../../app/utils/login-redirect'

describe('login redirect helpers', () => {
  it.each([
    ['bcsc', 'bcsc'],
    ['BCEID', 'bceid'],
    [' idir ', 'idir']
  ])('normalizes supported idp %s', (value, expected) => {
    expect(parseLoginIdp(value)).toBe(expected)
  })

  it('accepts the first value from an array query parameter', () => {
    expect(parseLoginIdp(['bceid', 'bcsc'])).toBe('bceid')
  })

  it.each([undefined, '', 'unknown', ['unknown']])('rejects unsupported idp %s', (value) => {
    expect(parseLoginIdp(value)).toBeNull()
  })

  it('does not auto-login when the feature flag is disabled', () => {
    expect(getDirectLoginIdp({ idp: 'bcsc' }, undefined, 'http://localhost:3000/', false)).toBeNull()
  })

  it('returns no login hint when the return URL is absent', () => {
    expect(getDirectLoginIdp({}, undefined, 'http://localhost:3000', true)).toBeNull()
  })

  it('prefers a top-level idp over the return URL', () => {
    expect(getDirectLoginIdp(
      { idp: 'bcsc' },
      '/en-CA/dashboard/registration/H1?idp=bceid',
      'http://localhost:3000',
      true
    )).toBe('bcsc')
  })

  it('reads idp from the nested return URL when enabled', () => {
    expect(getDirectLoginIdp(
      {},
      '/en-CA/dashboard/registration/H1?idp=bceid',
      'http://localhost:3000/',
      true
    )).toBe('bceid')
  })

  it('builds a direct account-aware callback without duplicate slashes', () => {
    expect(buildLoginRedirectUrl(
      'http://localhost:3000/',
      'en-CA',
      '/auth/account/choose-existing',
      '/en-CA/dashboard/registration/H1?accountId=2866'
    )).toBe('http://localhost:3000/en-CA/dashboard/registration/H1?accountId=2866')
  })

  it('uses the configured redirect path when no return URL exists', () => {
    expect(buildLoginRedirectUrl('http://localhost:3000/', 'en-CA', '/auth/login', undefined))
      .toBe('http://localhost:3000/en-CA/auth/login')
  })

  it('returns no callback URL when no redirect is configured', () => {
    expect(buildLoginRedirectUrl('http://localhost:3000', 'en-CA', '', undefined)).toBeUndefined()
  })

  it('returns the original path when no account-aware redirect is configured', () => {
    expect(buildLoginRedirectUrl('http://localhost:3000', 'en-CA', '', '/en-CA/dashboard'))
      .toBe('http://localhost:3000/en-CA/dashboard')
  })

  it('builds a return-preserving account-choice callback without accountId', () => {
    const result = buildLoginRedirectUrl(
      'https://dev.host.shorttermrental.registry.gov.bc.ca',
      'en-CA',
      '/auth/account/choose-existing',
      '/en-CA/dashboard/registration/H1'
    )
    expect(result).toBe(
      'https://dev.host.shorttermrental.registry.gov.bc.ca/en-CA/auth/account/choose-existing' +
      '?return=%2Fen-CA%2Fdashboard%2Fregistration%2FH1'
    )
  })
})
