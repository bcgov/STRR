export default defineNuxtRouteMiddleware(() => {
  const { isAuthenticated } = useKeycloak()
  const localePath = useLocalePath()

  if (!isAuthenticated.value) {
    return navigateTo(localePath('/auth/login'))
  }
})
