export default defineNuxtPlugin(() => {
  const strrApiUrl = useRuntimeConfig().public.strrApiURL
  const accountStore = useConnectAccountStore()
  const localePath = useLocalePath()

  const { $keycloak } = useNuxtApp()

  const api = $fetch.create({
    baseURL: strrApiUrl,
    onRequest ({ options }) {
      const headers = options.headers ||= {}
      if (Array.isArray(headers)) {
        headers.push(['Authorization', `Bearer ${$keycloak.token}`])
        headers.push(['Account-Id', accountStore.currentAccount.id])
      } else if (headers instanceof Headers) {
        headers.set('Authorization', `Bearer ${$keycloak.token}`)
        headers.set('Account-Id', accountStore.currentAccount.id)
      } else {
        headers.Authorization = `Bearer ${$keycloak.token}`
        headers['Account-Id'] = accountStore.currentAccount.id
      }
    },
    async onResponseError ({ response }) {
      if (response.status === 401) {
        await navigateTo(localePath('/auth/login'))
      }
    }
  })

  return {
    provide: {
      strrApi: api
    }
  }
})
