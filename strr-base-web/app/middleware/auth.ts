export default defineNuxtRouteMiddleware(() => {
  const { isAuthenticated, kcUser, logout } = useKeycloak()
  const allowedIdps = useAppConfig().strrBaseLayer.page.login.options.idps
  if (!isAuthenticated.value) { // redirect to login page if user not authenticated
    const localePath = useLocalePath()
    return navigateTo(localePath('/auth/login'))
  } else if (isAuthenticated.value && !allowedIdps.includes(kcUser.value.loginSource.toLowerCase())) { // log user out and redirect to login page if user authenticated with invalid login source
    const locale = useNuxtApp().$i18n.locale.value
    const redirectUrl =
      useRuntimeConfig().public.baseUrl + locale + '/auth/login?invalidIdp=' + kcUser.value.loginSource
    logout(redirectUrl)
  }
})
