/**
 * Composable for common dashboard page setup logic.
 * Extracts shared breadcrumb and owner setup between dashboard detail pages.
 */
export function useDashboardPage () {
  const { t } = useNuxtApp().$i18n
  const config = useRuntimeConfig().public
  const localePath = useLocalePath()
  const { isNewDashboardEnabled } = useHostFeatureFlags()
  const { permitDetails } = storeToRefs(useHostPermitStore())

  const owners = ref<ConnectAccordionItem[]>([])

  /**
   * Sets up breadcrumbs for dashboard detail pages
   * @param dashboardPath - Optional dashboard path (defaults to feature-flag based path)
   */
  const setupBreadcrumbs = (dashboardPath?: string) => {
    const path = dashboardPath ?? (isNewDashboardEnabled.value ? '/dashboard-new' : '/dashboard')
    setBreadcrumbs([
      {
        label: t('label.bcregDash'),
        to: config.registryHomeURL + 'dashboard',
        appendAccountId: true,
        external: true
      },
      {
        label: t('strr.title.dashboard'),
        to: localePath(path)
      },
      { label: permitDetails.value.unitAddress.nickname || t('strr.label.unnamed') }
    ])
  }

  /**
   * Sets up sidebar accordion owners
   */
  const setupOwners = () => {
    owners.value = getHostPermitDashOwners()
  }

  return {
    owners,
    setupBreadcrumbs,
    setupOwners
  }
}
