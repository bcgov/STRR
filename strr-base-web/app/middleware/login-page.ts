export default defineNuxtRouteMiddleware(() => {
  const { isAuthenticated } = useKeycloak()

  if (isAuthenticated.value) {
    return navigateTo({ path: useLocalePath()('/') })
  }
})
