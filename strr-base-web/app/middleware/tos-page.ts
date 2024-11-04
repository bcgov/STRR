export default defineNuxtRouteMiddleware(async () => {
  const tosStore = useTosStore()
  const localePath = useLocalePath()

  // check if tos exists or is not accepted
  if (tosStore.tos.isTermsOfUseAccepted === undefined) {
    await tosStore.getTermsOfUse() // load latest tos if no tos found in store
  }

  // redirect home if tos already accepted
  // TODO: set app config for redirect? currently this will go home which will redirect
  // to whatever is set in the nuxt config route rules
  if (tosStore.tos.isTermsOfUseAccepted) {
    return navigateTo(localePath('/'))
  }
})
