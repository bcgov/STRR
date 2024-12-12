export default defineNuxtRouteMiddleware(() => {
  const accountStore = useConnectAccountStore()
  const localePath = useLocalePath()
  const { kcUser } = useKeycloak()

  if (accountStore.userAccounts.length === 0 && kcUser.value.loginSource !== LoginSource.BCEID) {
    return navigateTo({ path: localePath('/auth/account/create-new') }) // TODO: add return url param for redirect?
  }
})
