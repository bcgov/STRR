export default defineNuxtRouteMiddleware(async (to) => {
  // TODO: update with unique code check for renewals?
  if (to.query.override !== 'true') {
    const localePath = useLocalePath()
    const { application, loadPermitData } = useStrrBasePermit()
    await loadPermitData(undefined, ApplicationType.PLATFORM)

    if (application.value !== undefined) {
      return navigateTo(localePath('/platform/dashboard'))
    }
  }
})
