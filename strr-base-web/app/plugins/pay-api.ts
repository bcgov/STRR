export default defineNuxtPlugin(() => {
  const payApiUrl = useRuntimeConfig().public.payApiURL
  const { $keycloak } = useNuxtApp()

  const api = $fetch.create({
    baseURL: payApiUrl,
    onRequest ({ options }) {
      const headers = options.headers ||= {}
      if (Array.isArray(headers)) {
        headers.push(['Authorization', `Bearer ${$keycloak.token}`])
      } else if (headers instanceof Headers) {
        headers.set('Authorization', `Bearer ${$keycloak.token}`)
      } else {
        headers.Authorization = `Bearer ${$keycloak.token}`
      }
    }
  })

  return {
    provide: {
      payApi: api
    }
  }
})
