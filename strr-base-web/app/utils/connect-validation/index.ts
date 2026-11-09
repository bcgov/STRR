import { z } from 'zod'

export * from './address'
export * from './business-number'
export * from './email'
export * from './folio-number'
export * from './name'
export * from './parcel-identifier'
export * from './phone'
export * from './tax-number'
export * from './urls'

export const optionalOrEmptyString = z
  .string()
  .trim()
  .optional()
  .transform(e => (e === '' ? undefined : e))

export const getRequiredNonEmptyString = (message: string) => z.string().trim().refine(e => e !== '', message)

export const checkSpecialCharacters = (input: string | undefined): boolean => {
  return input === undefined || /^[\d\s]*$/.test(input)
}
