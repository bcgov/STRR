export default defineNuxtPlugin(() => {
  const strrApiUrl = useRuntimeConfig().public.strrApiURL
  const accountStore = useConnectAccountStore()
  const localePath = useLocalePath()

  const { $keycloak } = useNuxtApp()

  const api = $fetch.create({
    baseURL: strrApiUrl,
    onRequest ({ options }) {
      options.headers.set('Authorization', `Bearer ${$keycloak.token}`)
      options.headers.set('Account-Id', accountStore.currentAccount.id)
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
