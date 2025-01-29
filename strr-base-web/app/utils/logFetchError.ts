export function logFetchError (error: unknown, message: string) {
  let status = 'Unknown Status'
  let statusText = 'Unknown Status Text'
  let hasMessage = false

  if (error && typeof error === 'object' && 'response' in error && typeof (error as any).response === 'object') {
    const response = (error as any).response

    if ('status' in response && typeof response.status === 'number') {
      status = response.status
    }

    if ('statusText' in response && typeof response.statusText === 'string') {
      statusText = response.statusText
    }

    if (
      'data' in error &&
      (error as any).data &&
      typeof (error as any).data === 'object' &&
      'message' in (error as any).data
    ) {
      statusText = statusText || (error as any).data.message
      hasMessage = (error as any).data.message !== undefined
    }

    console.error(
      `${message}: ${status} - ${statusText} ${
        hasMessage ? `--- ${JSON.stringify((error as any).data)}` : ''
      }`
    )
  } else {
    console.error(message)
  }
}
