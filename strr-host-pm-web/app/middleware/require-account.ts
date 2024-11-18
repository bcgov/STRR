export default defineNuxtRouteMiddleware((to) => {
  const accountStore = useConnectAccountStore()
  const localePath = useLocalePath()

  if (!accountStore.currentAccount.id) {
    return navigateTo({ path: localePath('/auth/account/choose-existing'), query: { return: to.fullPath } })
  }
})
