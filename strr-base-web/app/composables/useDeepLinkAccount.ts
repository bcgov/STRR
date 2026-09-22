type AccountEligibility = (account: Account) => boolean
type DeepLinkAccountStore = Pick<ReturnType<typeof useConnectAccountStore>, 'userAccounts' | 'switchCurrentAccount'>

export function selectDeepLinkAccount (
  accountStore: DeepLinkAccountStore,
  route: { query: Record<string, unknown> },
  isEligible: AccountEligibility = account => account.accountStatus === 'ACTIVE'
) {
  const accountId = typeof route.query.accountId === 'string' ? route.query.accountId : undefined
  if (!accountId) {
    return
  }

  const account = accountStore.userAccounts.find(candidate => String(candidate.id) === accountId)
  if (account && isEligible(account)) {
    accountStore.switchCurrentAccount(account.id as unknown as string)
  }
}

export const useDeepLinkAccount = () => {
  const accountStore = useConnectAccountStore()

  const selectFromRoute = (
    route: { query: Record<string, unknown> },
    isEligible: AccountEligibility = account => account.accountStatus === AccountStatus.ACTIVE
  ) => {
    selectDeepLinkAccount(accountStore, route, isEligible)
  }

  return { selectFromRoute }
}
