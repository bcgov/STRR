export interface BreadcrumbI {
  label: string
  to?: string
}

export type BreadcrumbsI = {
  [key in RouteNamesE]: BreadcrumbI[]
}
