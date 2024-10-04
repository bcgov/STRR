import { FetchError } from 'ofetch'
export function logFetchError (error: unknown, message: string) {
  if (error instanceof FetchError) {
    const e = error as FetchError
    const status = e.response?.status ?? 'Unknown Status'
    const statusText = e.response?.statusText ?? 'Unknown Status Text'
    const hasMessage = e.data?.message !== undefined

    console.error(`${message}: ${status} - ${statusText} ${hasMessage ? `--- ${JSON.stringify(e.data)}` : ''}`)
  } else {
    console.error(message)
  }
}
