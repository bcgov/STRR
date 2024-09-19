import { useRoute } from 'vue-router'
import {
  hostBreadcrumbs,
  examinerBreadcrumbs
} from '~/page-data/breadcrumbs'

export const useBreadcrumb = () => {
  const route = useRoute()
  const strrStore = useStrrStore()
  const { getApplicationId, getApplicationNickname, getRegistrationNumber } = storeToRefs(strrStore)
  const { isExaminer } = useBcrosKeycloak()
  const { t } = useTranslation()

  const { setApplicationId, setApplicationNickname, setRegistrationNumber } = useStrrStore()

  const NO_BREADCRUMB_ROUTES = [
    RouteNamesE.TERMS_OF_SERVICE,
    RouteNamesE.FINALIZATION,
    RouteNamesE.ACCOUNT_SELECT,
    RouteNamesE.APPLICATION_SUBMITTED
  ]

  // set store values for breadcrumb
  const setupBreadcrumbData = (application: ApplicationI) => {
    setApplicationId(application?.header.id.toString())
    setApplicationNickname(application?.registration.unitAddress.nickname)
    setRegistrationNumber(application?.header.registrationNumber)
  }

  // Remove '-id' suffix and language codes (e.g., '___en') from route names to match RouteNamesE enum values
  const cleanupRoute = (routeName: string) => {
    return routeName?.replace(/(-id|___\w{2}$)/g, '') as RouteNamesE
  }

  /**
   * Create breadcrumb links for the current route, including dynamic labels based on
   * application or registration details.
   *
   * @returns {BreadcrumbI[]} An array of breadcrumb objects for the current route
   */
  const getBreadcrumbLinks = computed((): BreadcrumbI[] => {
    const routeName = route.name?.toString()

    // cleanup route from locale and id suffix
    const currentRouteName = cleanupRoute(routeName as RouteNamesE)

    // get nickname or set as empty string
    const nickname = getApplicationNickname.value ? `${getApplicationNickname.value}, ` : ''

    // set base Breadcrumb based on role
    const breadcrumbLinks = isExaminer
      ? [...(examinerBreadcrumbs[currentRouteName] || [])]
      : [...(hostBreadcrumbs[currentRouteName] || [])]

    // add custom Breadcrumb info based on current route
    switch (currentRouteName) {
      case RouteNamesE.APPLICATION_DETAILS:
        breadcrumbLinks[1] = {
          label: `${nickname}Application #${getApplicationId.value}`
        }
        break
      case RouteNamesE.APPLICATION_DETAILS_LTSA:
      case RouteNamesE.APPLICATION_DETAILS_AUTO_APPROVAL:
        breadcrumbLinks[1] = {
          label: `${nickname}Application #${getApplicationId.value}`,
          to: `/${RouteNamesE.APPLICATION_DETAILS}/${getApplicationId.value}`
        }
        breadcrumbLinks[2] = {
          label:
            currentRouteName === RouteNamesE.APPLICATION_DETAILS_LTSA
              ? t('ltsa.ltsaDetails')
              : t('autoApproval.automaticDetails')
        }
        break
      case RouteNamesE.REGISTRATION_DETAILS:
        breadcrumbLinks[1] = {
          label: `${nickname}Registration #${getRegistrationNumber.value}`
        }
        break
    }

    return breadcrumbLinks
  })

  // Disable Dashboard Back Button when already at top route (eg Dashboard route)
  const isDashboardButtonDisabled = computed((): boolean => {
    return [RouteNamesE.REGISTRY_DASHBOARD, RouteNamesE.APPLICATION_STATUS].includes(
      cleanupRoute(route.name?.toString() ?? '')
    )
  })

  // Check if breadcrumbs should be visible on certain routes
  const isBreadcrumbVisible = computed((): boolean =>
    NO_BREADCRUMB_ROUTES.every(routeName => !route.name?.toString().startsWith(routeName))
  )

  // Set the back button link to navigate one level up in breadcrumb
  const dashboardButtonLink = computed(():string => {
    const breadcrumbLinks = getBreadcrumbLinks.value
    // return second to last link for one level up
    return breadcrumbLinks[breadcrumbLinks.length - 2]?.to || ''
  })

  return {
    setupBreadcrumbData,
    getBreadcrumbLinks,
    isDashboardButtonDisabled,
    dashboardButtonLink,
    isBreadcrumbVisible
  }
}
