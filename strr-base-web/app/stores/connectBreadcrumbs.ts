import type { BreadcrumbLink } from '#ui/types'
import { useNavigate } from '../composables/useNavigate'

interface ConnectBreadcrumb extends BreadcrumbLink {
  appendAccountId?: boolean
}

export const useConnectBreadcrumbStore = defineStore('connect/breadcrumbs', () => {
  const accountStore = useConnectAccountStore()
  const { appendUrlParam } = useNavigate()

  const breadcrumbs = ref<ConnectBreadcrumb[]>([])

  const mappedCrumbs = computed<ConnectBreadcrumb[]>(() => {
    return breadcrumbs.value.map((bc) => {
      if (bc.appendAccountId && accountStore.currentAccount.id) {
        return {
          ...bc,
          to: appendUrlParam(bc.to as string, 'accountid', accountStore.currentAccount.id)
        }
      }
      return bc
    })
  })

  function setBreadcrumbs (bcs: ConnectBreadcrumb[]) {
    breadcrumbs.value = bcs
  }

  return {
    mappedCrumbs,
    setBreadcrumbs
  }
})
