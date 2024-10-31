export default defineNuxtRouteMiddleware((to) => {
  const accountStore = useConnectAccountStore()
  const localePath = useLocalePath()

  if (accountStore.currentAccount.accountType !== AccountType.PREMIUM ||
    accountStore.currentAccount.accountStatus !== AccountStatus.ACTIVE) {
    return navigateTo({ path: localePath('/auth/account/choose-existing'), query: { return: to.fullPath } })
  }
})
