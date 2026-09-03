export default class KeycloakMock {
  authenticated = false
  token = ''
  tokenParsed = {}

  init () { return Promise.resolve(false) }
  isTokenExpired () { return false }
  login () { return Promise.resolve() }
  logout () { return Promise.resolve() }
  updateToken () { return Promise.resolve(false) }
}
