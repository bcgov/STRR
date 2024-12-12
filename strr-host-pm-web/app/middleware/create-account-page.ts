export default defineNuxtRouteMiddleware(() => {
  const { kcUser } = useKeycloak()

  if (kcUser.value.loginSource !== LoginSource.BCSC) {
    const localePath = useLocalePath()
    return navigateTo({ path: localePath('/auth/account/choose-existing') })
  }
})