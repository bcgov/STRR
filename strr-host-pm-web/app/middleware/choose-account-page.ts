export default defineNuxtRouteMiddleware(() => {
  const accountStore = useConnectAccountStore()
  const localePath = useLocalePath()

  if (accountStore.userAccounts.length === 0) {
    return navigateTo({ path: localePath('/auth/account/create-new') }) // TODO: add return url param for redirect?
  }
})
