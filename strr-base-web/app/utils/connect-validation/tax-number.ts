import { z } from 'zod'

/**
 * Check if the tax number has 9 digits
 * @param {string} taxNumber - string representation of the tax number input
 */
export const checkTaxNumberLength = (taxNumber: string | undefined): boolean => {
  if (taxNumber === undefined) {
    return false
  }
  const digits = taxNumber.replace(/\s+/g, '')
  return digits.length === 9
}

/**
 * Check if the tax number is valid
 * @param {string} taxNumber - string representation of the tax number input
 */
export const validateTaxNumber = (taxNumber: string | undefined, optional = false): boolean => {
  const digits = taxNumber?.replace(/\s+/g, '')
  // SIN Validation rule used: https://en.wikipedia.org/wiki/Social_insurance_number
  if (digits === undefined || digits === '') {
    return optional
  }

  // Case 1: the input is not 9 digits
  // Case 2: the input is '000000000', which is invalid even if it can pass the checksum test
  // Case 3: currently no tax number starts with 8
  if (digits.length !== 9 || digits === '000000000' || digits[0] === '8') {
    return false
  }

  let checkSum = 0

  for (let i = 0; i < 9; i++) {
    // @ts-ignore
    const digit = parseInt(digits[i])
    if (i % 2 === 0) {
      checkSum += digit
    } else {
      const product = digit * 2
      if (product < 10) {
        checkSum += product
      } else {
        checkSum += product - 9
      }
    }
  }

  return checkSum % 10 === 0
}

export const validateTaxNumberOptional = (taxNumber: string | undefined) => validateTaxNumber(taxNumber, true)

export const getRequiredSin = (message: string) => z.string().refine(validateTaxNumber, message)
export const getOptionalSin = (message: string) => z.string().optional().refine(validateTaxNumberOptional, message)
