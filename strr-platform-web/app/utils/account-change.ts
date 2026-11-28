// warning modal to prevent account change
export function manageAccountChangeApplication (_oldAccount: Account, newAccount: Account) {
  const strrModal = useStrrModals()
  strrModal.openConfirmSwitchAccountModal(newAccount.id)
  return false // return false to abort account change
}

// change accounts and reload the platform dashboard for the new account
export function manageAccountChangeDashboard (_oldAccount: Account, newAccount: Account) {
  useConnectAccountStore().switchCurrentAccount(newAccount.id)
  const path = useLocalePath()('/platform/dashboard')
  // full reload so the dashboard data and account middleware run for the new account
  // (wait a tick so the persisted account store is saved first)
  // force: without it nuxt skips a reload to the same path within 10s, so a quick second switch wouldn't reload
  nextTick(() => reloadNuxtApp({ path, force: true }))
  return true
}
