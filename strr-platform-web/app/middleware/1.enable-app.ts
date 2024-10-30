export default defineNuxtRouteMiddleware(async () => {
  const { ldClient, getStoredFlag } = useConnectLaunchdarklyStore()
  await ldClient?.waitUntilReady()
  if (!getStoredFlag('enable-public-users')) {
    return navigateTo({ path: useLocalePath()('/comingSoon') })
  }
})
