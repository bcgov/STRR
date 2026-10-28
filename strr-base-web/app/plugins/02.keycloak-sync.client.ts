// Proactively refresh tokens when tab returns from background or sleep
export default defineNuxtPlugin(() => {
  const { $keycloak } = useNuxtApp()

  if (import.meta.server || !$keycloak) {
    return
  }

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && $keycloak.authenticated) {
      try {
        // If tab was suspended/asleep and token has < 2 mins validity left, refresh immediately
        const refreshed = await $keycloak.updateToken(120)
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
})
