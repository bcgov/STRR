import { createGtm } from '@gtm-support/vue-gtm'

export default defineNuxtPlugin((nuxtApp) => {
  const { enableRouterSync, ...options } = useRuntimeConfig().public.gtm

  nuxtApp.vueApp.use(createGtm({
    ...options,
    vueRouter: enableRouterSync ? useRouter() : undefined
  }))
})
