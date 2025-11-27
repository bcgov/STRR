export default defineNuxtRouteMiddleware((to) => {
  const { isNewDashboardEnabled } = useHostFeatureFlags()
  const localePath = useLocalePath()

  const isNewDashboardIndex = to.path.endsWith('/dashboard-new')
  const isLegacyDashboardIndex = to.path.endsWith('/dashboard')

  if (isNewDashboardEnabled.value && isLegacyDashboardIndex) {
    return navigateTo(localePath('/dashboard-new'))
  }

  if (!isNewDashboardEnabled.value && isNewDashboardIndex) {
    return navigateTo(localePath('/dashboard'))
  }
})
