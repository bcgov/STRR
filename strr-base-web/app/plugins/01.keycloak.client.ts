import Keycloak from 'keycloak-js'

export default defineNuxtPlugin(async () => {
  const rtc = useRuntimeConfig().public

  // define new keycloak
  const keycloak = new Keycloak({
    url: rtc.keycloakAuthUrl,
    realm: rtc.keycloakRealm,
    clientId: rtc.keycloakClientId
  })

  try {
    // init keycloak instance
    await keycloak.init({
      onLoad: 'check-sso',
      responseMode: 'query',
      pkceMethod: 'S256'
    })
  } catch (error) {
    console.error('[Auth] Failed to initialize Keycloak adapter: ', error)
  }

  const refreshIntervalTimeout = rtc.tokenRefreshInterval as number
  const minValidity = toValue((rtc.tokenMinValidity as number) / 1000) // convert to seconds
  const idleTimeout = rtc.sessionIdleTimeout as number
  const modalTimeout = rtc.sessionExpiredModalTimeout as number
  let modalTimeoutId: ReturnType<typeof setTimeout> | null = null

  // default behaviour when keycloak session expires
  // try to update token - log out if token update fails
  keycloak.onTokenExpired = async () => {
    await keycloak.updateToken(minValidity).catch(() => {
      console.error('[Auth] Failed to refresh token on expiration; logging out.')
      keycloak.logout()
    })
  }

  const route = useRoute()
  const { idle } = useIdle(idleTimeout)

  function resetSessionTimeout () {
    if (modalTimeoutId) {
      clearTimeout(modalTimeoutId)
      modalTimeoutId = null
    }
  }

  // executed when user is authenticated and idle = true
  // if route meta provided, override default behaviour
  async function sessionExpired () {
    if (route.meta.sessionExpiredFn) {
      const result = route.meta.sessionExpiredFn()
      if (result instanceof Promise) {
        await result
      }
    } else {
      // cleanup modal timeout if exists
      resetSessionTimeout()

      // start countdown until user logged out
      modalTimeoutId = setTimeout(async () => {
        if (route.meta.onBeforeSessionExpired) {
          const result = route.meta.onBeforeSessionExpired()
          if (result instanceof Promise) {
            await result
          }
        }
        sessionStorage.setItem(ConnectStorageKeys.CONNECT_SESSION_EXPIRED, 'true')
        keycloak.logout()
      }, modalTimeout)

      // open modal and pass resetSessionTimeout as a callback to clear the timeout
      // if the user closes the modal with click/keyboard event
      useConnectModals().openSessionExpiringModal(resetSessionTimeout)
    }
  }

  function scheduleRefreshToken () {
    setTimeout(async () => {
      // do not refresh if user not authenticated or idle
      if (!keycloak.authenticated || idle.value) {
        console.info('[Auth] User unauthenticated or inactive, stopping token refresh schedule.')
        return
      }

      if (keycloak.isTokenExpired(minValidity)) {
        console.info('[Auth] Token set to expire soon. Refreshing token...')
        try {
          await keycloak.updateToken(minValidity)
          console.info('[Auth] Token updated.')
        } catch (error) {
          console.error('[Auth] Error updating token:', error)
          keycloak.logout() // log user out if token update fails
        }
      }
      // re-schedule only if the user remains active and authenticated
      if (keycloak.authenticated && !idle.value) {
        scheduleRefreshToken()
      }
    }, refreshIntervalTimeout)
  }

  // Proactively refresh tokens when tab returns from background or sleep
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && keycloak.authenticated) {
      try {
        const refreshed = await keycloak.updateToken(minValidity)
        if (refreshed) {
          console.info('[Auth] Tab focused: token refreshed successfully.')
        } else {
          console.info('[Auth] Tab focused: token is still valid.')
        }
      } catch (error) {
        console.warn('[Auth] Tab focused: failed to refresh token:', error)
      }
    }
  })

  // Watch for changes in authentication and idle state
  // When the user is authenticated and not idle, start the refresh schedule
  // Execute session expiry handling if user authenticated and inactive
  watch(
    [() => keycloak.authenticated, () => idle.value],
    async ([isAuth, isIdle]) => {
      if (isAuth) {
        sessionStorage.removeItem(ConnectStorageKeys.CONNECT_SESSION_EXPIRED)
        if (!isIdle) {
          scheduleRefreshToken()
        } else {
          await sessionExpired()
        }
      }
    },
    { immediate: true }
  )

  return {
    provide: {
      // provide global keycloak instance
      keycloak
    }
  }
})
