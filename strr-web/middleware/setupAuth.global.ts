export default defineNuxtRouteMiddleware(async (to) => {
  // setup auth
  if ((!to.query.error) && !process.env.VITEST_WORKER_ID) {
    // keycloak redirects with the error param when not logged in (nuxt/keycloak issue)
    //   - removing ^ condition will cause an infinite loop of keycloak redirects when not authenticated
    const { kcURL, kcRealm, kcClient } = useRuntimeConfig().public
    await useBcrosAuth().setupAuth(
      {
        url: kcURL,
        realm: kcRealm,
        clientId: kcClient
      },
      to.params.currentAccountId as string || to.query.currentAccountId as string
    )

    // For e2e testing, leave for now
    if (process.client && sessionStorage?.getItem('FAKE_LOGIN')) {
      const { kc } = useBcrosKeycloak()
      // set test kc values
      kc.tokenParsed = {
        firstname: 'TestFirst',
        lastname: 'TestLast',
        name: 'TestFirst TestLast',
        username: 'testUsername',
        email: 'testEmail@test.com',
        sub: 'testSub',
        loginSource: 'IDIR',
        realm_access: { roles: ['basic'] }
      }
      kc.authenticated = true
      const account = useBcrosAccount()
      await account.setUserName()
      await account.setAccountInfo()
    }
  }

  // initialize ldarkly
  // useBcrosLaunchdarkly().init()

  // remove query params in url added by keycloak
  if (to.query) {
    const params = new URLSearchParams(to.fullPath.split('?')[1])
    params.delete('state')
    params.delete('session_state')
    params.delete('code')
    params.delete('error')
    params.delete('iss')
    to.fullPath = to.path + (params.size > 0 ? `?${params}` : '') + to.hash
  }
})
