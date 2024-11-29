import type { FetchError } from 'ofetch'
export interface PropertyRequirementsError {
  error?: FetchError
  type: 'fetch' | 'unknown' // TODO: handle other error types
}
