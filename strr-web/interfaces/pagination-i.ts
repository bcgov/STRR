export interface PaginationI {
  filter_by_status?: string,
  offset?: string,
  limit?: string,
  sort_by?: string,
  sort_desc?: string,
  search?: string
}

export enum RegistrationStatusesE {
  ACTIVE,
  EXPIRED,
  SUSPENDED,
  CANCELLED
}
