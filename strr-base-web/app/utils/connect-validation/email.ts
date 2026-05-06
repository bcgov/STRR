import { z } from 'zod'

const emailLengths = (email: string): boolean => {
  if (!email || email.length > 254) {
    return false
  }
  const [localPart, domainPart, shouldBeUndefined] = email.split('@')
  if (shouldBeUndefined !== undefined) {
    return false
  }
  if (!localPart || localPart.length > 63) {
    return false
  }
  if (!domainPart || domainPart.length > 252) {
    return false
  }
  return true
}

/**
 * Tests if the email matches rfc 5322
 * @param email string representation of email address that you want to verify against rfc 5322 regex
 */
export const validateEmailRfc5322Regex = (email: string): boolean => {
  return emailLengths(email) &&
    // eslint-disable-next-line no-useless-escape
    /^("(?:[!#-\[\]-~]|\\[\t -~])*"|[!#-'*+\-/-9=?A-Z\^-~](?:\.?[!#-'*+\-/-9=?A-Z\^-~])*)@([!#-'*+\-/-9=?A-Z\^-~](?:\.?[!#-'*+\-/-9=?A-Z\^-~])*|\[[!-Z\^-~]*\])$/.test(email) // NOSONAR
}

/**
 * Tests if the email matches rfc 6532
 * @param email string representation of email address that you want to verify against rfc 6532 regex
 */
export const validateEmailRfc6532Regex = (email: string): boolean => {
  return emailLengths(email) &&
    // eslint-disable-next-line no-useless-escape
    /^("(?:[!#-\[\]-\u{10FFFF}]|\\[\t -\u{10FFFF}])*"|[!#-'*+\-/-9=?A-Z\^-\u{10FFFF}](?:\.?[!#-'*+\-/-9=?A-Z\^-\u{10FFFF}])*)@([!#-'*+\-/-9=?A-Z\^-\u{10FFFF}](?:\.?[!#-'*+\-/-9=?A-Z\^-\u{10FFFF}])*|\[[!-Z\^-\u{10FFFF}]*\])$/u.test(email) // NOSONAR
}

/**
 * Tests an email against a stricter pattern that real world
 * mail systems (and downstream notify providers) actually accept.
 *
 * RFC 5322/6532 allow many edge-case characters (e.g. `$` in a domain) that
 * notify providers reject. Pairing those checks with this practical pattern
 * keeps user input aligned with what the API can actually deliver.
 *
 * Rules enforced beyond the RFC checks:
 *  - domain must contain at least one dot (TLD required)
 *  - each domain label must start/end with an alphanumeric character
 *  - domain labels are restricted to letters, digits, and hyphens
 *  - top-level domain must be at least two letters
 */
export const validateEmailPractical = (email: string): boolean => {
  if (!emailLengths(email)) {
    return false
  }
  // eslint-disable-next-line no-useless-escape
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~\-]+@[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(email)
}

const trimmedEmail = z
  .string()
  .transform(value => (typeof value === 'string' ? value.trim() : value))

export const getRequiredEmail = (message: string) =>
  trimmedEmail
    .refine(validateEmailRfc6532Regex, message)
    .refine(validateEmailRfc5322Regex, message)
    .refine(validateEmailPractical, message)

export const getOptionalEmail = (message: string) =>
  trimmedEmail.refine((email: string) => {
    if (email) {
      return validateEmailRfc6532Regex(email) &&
        validateEmailRfc5322Regex(email) &&
        validateEmailPractical(email)
    }
    return true
  }, message)
