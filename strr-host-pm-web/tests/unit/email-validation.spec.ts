import { describe, it, expect } from 'vitest'

const VALID_EMAILS = [
  'host@example.com',
  'foo.bar@example.com',
  'foo+bar@example.co.uk',
  'foo_bar@example-host.com',
  "user'name@example.com",
  'a@b.co',
  '123@example.com'
]

const INVALID_EMAILS = [
  '',
  'notanemail',
  'no-at-sign.com',
  'foo@',
  '@example.com',
  'foo@bar',
  'foo@bar.',
  'foo@.bar.com',
  'foo@-bar.com',
  'foo@bar-.com',
  'bas@ba$.com',
  'foo@bar..com',
  'foo bar@example.com',
  'foo@bar.c',
  'foo@@bar.com',
  `${'a'.repeat(64)}@example.com`,
  `host@${'a'.repeat(250)}.com`
]

describe('validateEmailPractical', () => {
  it.each(VALID_EMAILS)('accepts deliverable email: %s', (email) => {
    expect(validateEmailPractical(email)).toBe(true)
  })

  it.each(INVALID_EMAILS)('rejects invalid email: %s', (email) => {
    expect(validateEmailPractical(email)).toBe(false)
  })
})

describe('getRequiredEmail', () => {
  const schema = getRequiredEmail('Please enter a valid email')

  it.each(VALID_EMAILS)('accepts valid email: %s', (email) => {
    const result = schema.safeParse(email)
    expect(result.success).toBe(true)
  })

  it.each(INVALID_EMAILS)('rejects invalid email: %s', (email) => {
    const result = schema.safeParse(email)
    expect(result.success).toBe(false)
  })

  it('rejects an undefined email', () => {
    const result = schema.safeParse(undefined)
    expect(result.success).toBe(false)
  })

  it('trims surrounding whitespace before validating', () => {
    const result = schema.safeParse('  host@example.com  ')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('host@example.com')
    }
  })

  it('rejects whitespace-only input', () => {
    const result = schema.safeParse('   ')
    expect(result.success).toBe(false)
  })

  it('returns the configured error message for invalid input', () => {
    const result = schema.safeParse('bas@ba$.com')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Please enter a valid email')
    }
  })
})

describe('getOptionalEmail', () => {
  const schema = getOptionalEmail('Please enter a valid email')

  it('accepts an empty string', () => {
    expect(schema.safeParse('').success).toBe(true)
  })

  it('accepts a valid email', () => {
    expect(schema.safeParse('host@example.com').success).toBe(true)
  })

  it('rejects an invalid email when provided', () => {
    expect(schema.safeParse('bas@ba$.com').success).toBe(false)
  })

  it('trims and accepts whitespace-padded valid email', () => {
    const result = schema.safeParse('  host@example.com  ')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('host@example.com')
    }
  })
})

describe('legacy RFC validators (still exported for backward compatibility)', () => {
  it('validateEmailRfc5322Regex accepts a typical email', () => {
    expect(validateEmailRfc5322Regex('host@example.com')).toBe(true)
  })

  it('validateEmailRfc6532Regex accepts a typical email', () => {
    expect(validateEmailRfc6532Regex('host@example.com')).toBe(true)
  })

  it('legacy RFC checks alone do not catch domains with `$` (which the practical check now blocks)', () => {
    expect(validateEmailRfc5322Regex('bas@ba$.com')).toBe(true)
    expect(validateEmailPractical('bas@ba$.com')).toBe(false)
  })
})
