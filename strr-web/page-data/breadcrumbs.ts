import { RouteNamesE } from '~/enums/route-names-e'
import { BreadcrumbsI } from '~/interfaces/breadcrumb-i'

export const hostDashboardBreadcrumb: Array<BreadcrumbI> = [
  {
    label: 'My STR Registry Dashboard'
  }
]

export const examinerDashboardBreadcrumb: Array<BreadcrumbI> = [
  {
    label: 'My CEU STR Registry Dashboard'
  }
]

export const strRegistrationBreadcrumb: Array<BreadcrumbI> = [
  {
    label: 'My STR Registry Dashboard',
    to: '/' + RouteNamesE.APPLICATION_STATUS
  },
  {
    label: 'Short-Term Rental Registration'
  }
]

export const applicationDetailsBreadcrumb: Array<BreadcrumbI> = [
  {
    label: 'My STR Registry Dashboard',
    to: '/' + RouteNamesE.APPLICATION_STATUS
  }
]

export const examinerApplicationDetailsBreadcrumb: Array<BreadcrumbI> = [
  {
    label: 'My CEU STR Registry Dashboard',
    to: '/' + RouteNamesE.REGISTRY_DASHBOARD
  }
]

export const examinerStrRegistrationBreadcrumb: Array<BreadcrumbI> = [
  {
    label: 'My CEU STR Registry Dashboard',
    to: '/' + RouteNamesE.REGISTRY_DASHBOARD
  },
  {
    label: 'Short-Term Rental Registration'
  }
]

export const hostBreadcrumbs: Partial<BreadcrumbsI> = {
  [RouteNamesE.APPLICATION_STATUS]: hostDashboardBreadcrumb,
  [RouteNamesE.APPLICATION_DETAILS]: applicationDetailsBreadcrumb,
  [RouteNamesE.CREATE_ACCOUNT]: strRegistrationBreadcrumb,
  [RouteNamesE.REGISTRATION_DETAILS]: applicationDetailsBreadcrumb
}

export const examinerBreadcrumbs: Partial<BreadcrumbsI> = {
  [RouteNamesE.APPLICATION_STATUS]: examinerDashboardBreadcrumb,
  [RouteNamesE.REGISTRY_DASHBOARD]: examinerDashboardBreadcrumb,
  [RouteNamesE.APPLICATION_DETAILS]: examinerApplicationDetailsBreadcrumb,
  [RouteNamesE.APPLICATION_DETAILS_LTSA]: examinerApplicationDetailsBreadcrumb,
  [RouteNamesE.APPLICATION_DETAILS_AUTO_APPROVAL]: examinerApplicationDetailsBreadcrumb,
  [RouteNamesE.CREATE_ACCOUNT]: examinerStrRegistrationBreadcrumb,
  [RouteNamesE.REGISTRATION_DETAILS]: examinerApplicationDetailsBreadcrumb
}
