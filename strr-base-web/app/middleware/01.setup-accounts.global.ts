// Refresh user account context on navigation, reusing successful account data for five minutes.
// Same name as the core-layer middleware; avoid refetching account data on every route.
const ACCOUNT_INFO_TTL_MS = 5 * 60 * 1000 // 5 minutes

export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) {
    return
  }
  const { isAuthenticated, kcUser } = useKeycloak()
  if (!isAuthenticated.value) {
    return
  }

  const accountStore = useConnectAccountStore()
  // The settings response contains all of a user's accounts, so this cache is user-scoped.
  const lastFetch = useState<{ userId: string, at: number } | null>('account-info-last-fetch', () => null)
  const isCached = lastFetch.value?.userId === kcUser.value.keycloakGuid &&
    Date.now() - lastFetch.value.at < ACCOUNT_INFO_TTL_MS
  const accounts = isCached ? undefined : await accountStore.getUserAccounts(kcUser.value.keycloakGuid)

  if (accounts !== undefined) {
    accountStore.userAccounts = accounts
    // Replace stale selected-account data, or fall back if that account was removed.
    accountStore.currentAccount = accounts.find(account => account.id === accountStore.currentAccount.id) ??
      accounts[0] ?? {} as Account
    await accountStore.setUserName()
  }
  // Status checks use the selected account and must run even when the account list is cached.
  await accountStore.checkAccountStatus()

  if (accounts !== undefined) {
    if (accountStore.currentAccount.id) {
      await accountStore.getPendingApprovalCount(Number(accountStore.currentAccount.id), kcUser.value.keycloakGuid)
    }
    lastFetch.value = { userId: kcUser.value.keycloakGuid, at: Date.now() }
  }
})
