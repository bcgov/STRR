export default defineNuxtRouteMiddleware(async () => {
  const { isAuthenticated } = useKeycloak()
  const { ldClient, getStoredFlag } = useConnectLaunchdarklyStore()
  await ldClient?.waitUntilReady()
  if (!getStoredFlag('enable-public-users') && isAuthenticated.value) {
    return navigateTo({ path: useLocalePath()('/comingSoon') })
  }
})
