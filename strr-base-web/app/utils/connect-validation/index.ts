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
  .optional()
  .transform(e => (e === '' ? undefined : e))

// TODO: implement for number fields ???
// export const optionalOrEmptyNumber = z
//   .number()
//   .optional()

export const getRequiredNonEmptyString = (message: string) => z.string().refine(e => e.trim() !== '', message)

export const checkSpecialCharacters = (input: string | undefined): boolean => {
  return input === undefined || /^[\d\s]*$/.test(input)
}
