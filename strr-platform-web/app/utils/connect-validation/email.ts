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

export const getRequiredEmail = (message: string) => z.string().refine(validateEmailRfc6532Regex, message)
export const getOptionalEmail = (message: string) => z.string().refine((email: string) => {
  if (email) {
    return validateEmailRfc6532Regex(email)
  }
  return true
}, message)
