import { z } from 'zod'

export const bn15Rgx = /^\d{9}[A-Za-z]{2}\d{4}$/

export const getOptionalBn15 = (message: string) => z
  .string()
  .refine(val => val === '' || bn15Rgx.test(val), message)
  .optional()

export const getRequiredBn15 = (message: string) => z
  .string()
  .refine(val => bn15Rgx.test(val), message)
