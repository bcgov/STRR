export default defineNuxtRouteMiddleware(async () => {
  const localePath = useLocalePath()
  const { application, loadPermitData } = useStrrBasePermit()

  await loadPermitData(undefined, ApplicationType.PLATFORM)

  if (application.value !== undefined) {
    return navigateTo(localePath('/platform/dashboard'))
  }
})
