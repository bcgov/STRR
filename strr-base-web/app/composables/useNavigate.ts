export const useNavigate = () => {
  const accountStore = useConnectAccountStore()
  function redirect (url: string, params?: { [key: string]: string }, target = '_self') {
    // get account id and set in params
    const redirectURL = new URL(url)
    const accountId = accountStore.currentAccount.id
    if (accountId) {
      redirectURL.searchParams.append('accountid', accountId.toString())
    }
    for (const [key, value] of Object.entries(params ?? {})) {
      redirectURL.searchParams.append(key, value)
    }
    // assume URL is always reachable
    window.open(redirectURL, target)
  }

  return { redirect }
}
