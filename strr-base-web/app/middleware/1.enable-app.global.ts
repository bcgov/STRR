export default defineNuxtRouteMiddleware(async (to) => {
  const comingSoonPath = useLocalePath()('/comingSoon')
  if (to.path !== comingSoonPath) {
    const { isAuthenticated } = useKeycloak()
    const { ldClient, getStoredFlag } = useConnectLaunchdarklyStore()
    await ldClient?.waitUntilReady()
    if (ldClient && !getStoredFlag('enable-public-users') && isAuthenticated.value) {
      return navigateTo({ path: comingSoonPath })
    }
  }
})
