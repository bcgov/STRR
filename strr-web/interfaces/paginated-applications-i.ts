export interface PaginatedApplicationsI {
  applications: ApplicationI[],
  limit: number,
  page: number,
  total: number
}
