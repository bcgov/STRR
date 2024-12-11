export default defineNuxtRouteMiddleware(async (to) => {
  // TODO: update with unique code check for renewals?
  if (to.query.override !== 'true') {
    const { application, loadPermitData } = useStrrBasePermit()
    await loadPermitData(undefined, ApplicationType.PLATFORM)

    if (application.value !== undefined) {
      const localePath = useLocalePath()
      return navigateTo(localePath('/platform/dashboard'))
    }
  }
})
