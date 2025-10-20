import { useRoute } from 'vue-router'
import { computed } from 'vue'

export const useRouterParams = () => {
  const route = useRoute()

  const applicationId = computed(() => route.query.applicationId as string)
  const isRenewal = computed(() => Boolean(route.query.renew === 'true'))

  return { applicationId, isRenewal }
}
