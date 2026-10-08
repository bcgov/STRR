// Replaces the core layer middleware of the same file name; caches account info instead of refetching per route.
const ACCOUNT_INFO_TTL_MS = 5 * 60 * 1000

export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) {
    return
  }
  const { isAuthenticated, kcUser } = useKeycloak()
  if (!isAuthenticated.value) {
    return
  }

  const accountStore = useConnectAccountStore()
  const lastFetch = useState<{ key: string, at: number } | null>('account-info-last-fetch', () => null)
  const cacheKey = () => `${kcUser.value.keycloakGuid}:${accountStore.currentAccount.id}`
  const isCached = lastFetch.value?.key === cacheKey() && Date.now() - lastFetch.value.at < ACCOUNT_INFO_TTL_MS

  if (!isCached) {
    await accountStore.setAccountInfo()
    await accountStore.setUserName()
  }
  await accountStore.checkAccountStatus()

  if (!isCached && accountStore.currentAccount.id && kcUser.value.keycloakGuid) {
    await accountStore.getPendingApprovalCount(parseInt(accountStore.currentAccount.id), kcUser.value.keycloakGuid)
    lastFetch.value = { key: cacheKey(), at: Date.now() }
  }
})
