export interface ApplicationError extends Error {
  statusCode?: number
  data?: any
}
