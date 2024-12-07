export default defineNuxtRouteMiddleware(async (to) => {
  const localePath = useLocalePath()
  const { application, loadPermitData } = useStrrBasePermit()

  // TODO: update with unique code check for renewals?
  if (to.query.override === 'true') {
    return
  }

  await loadPermitData(undefined, ApplicationType.PLATFORM)

  if (application.value !== undefined) {
    return navigateTo(localePath('/platform/dashboard'))
  }
})
