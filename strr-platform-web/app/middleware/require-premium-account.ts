export default defineNuxtRouteMiddleware(() => {
  const accountStore = useConnectAccountStore()

  if (accountStore.currentAccount.accountType !== AccountType.PREMIUM ||
    accountStore.currentAccount.accountStatus !== AccountStatus.ACTIVE) {
    return navigateTo({ path: useLocalePath()('/auth/account/choose-existing') })
  }
})
