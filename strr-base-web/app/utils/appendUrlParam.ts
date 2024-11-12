export function appendUrlParam (url: string, key: string, value: string | number) {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${key}=${value}`
}
