export default defineNuxtRouteMiddleware((to) => {
  const { isNewDashboardEnabled } = useHostFeatureFlags()
  const localePath = useLocalePath()

  const isNewDashboardRoute = to.path.includes('/dashboard-new')
  const isNewDetailRoute = to.path.includes('/dashboard/application/') || to.path.includes('/dashboard/registration/')
  const isLegacyDashboardRoute = to.path.includes('/dashboard') && !isNewDashboardRoute && !isNewDetailRoute

  if (isNewDashboardEnabled.value) {
    if (isLegacyDashboardRoute) {
      return navigateTo(localePath('/dashboard-new'))
    }
  } else if (isNewDashboardRoute || isNewDetailRoute) {
    return navigateTo(localePath('/dashboard'))
  }
})
