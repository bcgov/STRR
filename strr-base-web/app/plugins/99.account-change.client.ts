// Refresh the account-specific notification count when the header changes accounts without navigation.
export default defineNuxtPlugin(() => {
  const accountStore = useConnectAccountStore()
  const { isAuthenticated, kcUser } = useKeycloak()
  const lastFetch = useState<{ userId: string, at: number } | null>('account-info-last-fetch', () => null)

  watch(
    () => accountStore.currentAccount.id,
    async (accountId, previousAccountId) => {
      if (accountId === previousAccountId || lastFetch.value?.userId !== kcUser.value.keycloakGuid) {
        return
      }

      accountStore.pendingApprovalCount = 0

      if (!isAuthenticated.value || !accountId || !kcUser.value.keycloakGuid) {
        return
      }

      await accountStore.getPendingApprovalCount(Number(accountId), kcUser.value.keycloakGuid)
    }
  )
})
