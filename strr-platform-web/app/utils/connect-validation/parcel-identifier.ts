import { z } from 'zod'

export const pidRegex = /^\d{3}(-)\d{3}(-)\d{3}$/

export const getOptionalPID = (message: string) => z
  .string()
  .refine(val => val === '' || pidRegex.test(val), message)
  .optional()
