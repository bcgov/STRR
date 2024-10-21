import { z } from 'zod'

export * from './address'
export * from './email'
export * from './folio-number'
export * from './name'
export * from './parcel-identifier'
export * from './phone'
export * from './tax-number'

export const httpRegex = /^(https?:\/\/)([\w-]+(\.[\w-]+)+\.?(:\d+)?(\/.*)?)$/i

export const optionalOrEmptyString = z
  .string()
  .optional()
  .transform(e => (e === '' ? undefined : e))

export const getRequiredNonEmptyString = (message: string) => z.string().refine(e => e.trim() !== '', message)

export const getRequiredUrl = (message: string) =>
  z.string().refine(e => e.trim() !== '' && httpRegex.test(e), message)

/**
 * Normalizes a string.
 * If the input is provided, it removes leading, trailing, and extra spaces within the name.
 * If the input is undefined, it returns an empty string.
 * @param {string | undefined} input - the input to normalize.
 */
export const normalizeInput = (input?: string): string => {
  if (input === undefined) {
    return ''
  }
  return input.trim().replace(/\s+/g, ' ')
}

export const checkSpecialCharacters = (input: string | undefined): boolean => {
  return input === undefined || /^[\d\s]*$/.test(input)
}
