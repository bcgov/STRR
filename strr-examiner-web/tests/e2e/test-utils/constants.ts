import { LoginSource } from '../enums/login-source'

export const loginMethods = [LoginSource.IDIR, LoginSource.BCEID]

export function getPlaywrightE2eLoginSource (): LoginSource {
  return process.env.PLAYWRIGHT_E2E_LOGIN?.toLowerCase() === 'bceid' ? LoginSource.BCEID : LoginSource.IDIR
}

export function getPlaywrightE2eAuthStorageKey (): string {
  return getPlaywrightE2eLoginSource() === LoginSource.BCEID ? 'bceid-user' : 'idir-user'
}
