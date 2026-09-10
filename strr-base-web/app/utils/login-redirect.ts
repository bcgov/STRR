import type { StrrLoginIdp } from '~/types/strr-base-app-config'

const LOGIN_IDPS = ['bcsc', 'bceid', 'idir'] as const satisfies readonly StrrLoginIdp[]

export function parseLoginIdp (value: unknown): StrrLoginIdp | null {
  const normalized = (Array.isArray(value) ? value[0] : value)?.toString().toLowerCase().trim()
  return normalized && LOGIN_IDPS.includes(normalized as StrrLoginIdp)
    ? normalized as StrrLoginIdp
    : null
}

export function parseReturnUrlIdp (returnUrl: string | undefined, baseUrl: string): StrrLoginIdp | null {
  if (!returnUrl) {
    return null
  }
  return parseLoginIdp(new URL(returnUrl, `${baseUrl.replace(/\/$/, '')}/`).searchParams.get('idp'))
}

export function getDirectLoginIdp (
  query: Record<string, unknown>,
  returnUrl: string | undefined,
  baseUrl: string,
  enabled: boolean
): StrrLoginIdp | null {
  if (!enabled) {
    return null
  }
  return parseLoginIdp(query.idp) || parseReturnUrlIdp(returnUrl, baseUrl)
}

export function buildLoginRedirectUrl (
  baseUrl: string,
  locale: string,
  redirectPath: string,
  returnUrl: string | undefined
): string | undefined {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
  if (!returnUrl) {
    if (!redirectPath) {
      return undefined
    }
    return new URL(`${locale}/${redirectPath.replace(/^\/+/, '')}`, `${normalizedBaseUrl}/`).toString()
  }

  const returnTarget = new URL(returnUrl, `${normalizedBaseUrl}/`)
  if (returnTarget.searchParams.has('accountId')) {
    return returnTarget.toString()
  }

  if (!redirectPath) {
    return returnTarget.toString()
  }

  const loginTarget = new URL(`${locale}/${redirectPath.replace(/^\/+/, '')}`, `${normalizedBaseUrl}/`)
  loginTarget.searchParams.set('return', returnUrl)
  return loginTarget.toString()
}
