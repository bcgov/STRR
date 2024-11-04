import type { ZodIssue } from 'zod'

export type MultiFormValidationResult = {
  formId: string
  success: boolean
  errors: ZodIssue[]
}[]
