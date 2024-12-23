// warning modal to prevent account change
export function manageAccountChangeApplication (_oldAccount: Account, newAccount: Account) {
  const strrModal = useStrrModals()
  strrModal.openConfirmSwitchAccountModal(newAccount.id)
  return false // return false to abort account change
}

// change accounts and send user to reg dashboard
export function manageAccountChangeDashboard (_oldAccount: Account, newAccount: Account) {
  useConnectAccountStore().switchCurrentAccount(newAccount.id)
  const { handleExternalRedirect } = useConnectNav()
  handleExternalRedirect(useRuntimeConfig().public.registryHomeURL + 'dashboard')
  return true
}
