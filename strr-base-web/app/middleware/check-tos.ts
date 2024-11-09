export default defineNuxtRouteMiddleware(async (to) => {
  const tosStore = useTosStore()
  const localePath = useLocalePath()

  // check if tos exists or is not accepted
  if (tosStore.tos.isTermsOfUseAccepted === undefined || !tosStore.tos.isTermsOfUseAccepted) {
    await tosStore.getTermsOfUse() // load latest tos if no tos found in store or not accepted

    // return to tos page if not accepted
    if (!tosStore.tos.isTermsOfUseAccepted) {
      return navigateTo({ path: localePath('/auth/tos'), query: { return: to.fullPath } })
    }
  }
})
