/** Shared constants and mount options for renewal-related unit tests. */

export const emptyTodoRegistration = {
  hasRenewalTodo: false,
  hasRenewalDraft: false,
  hasRenewalPaymentPending: false,
  renewalDraftId: null,
  renewalPaymentPendingId: null
} as const

export const applicationPageStubs = {
  ConnectSpinner: true,
  ConnectTypographyH1: true,
  ModalGroupHelpAndInfo: true,
  FormDefineYourRental: true,
  FormAddOwners: true,
  FormAddDocuments: true,
  FormReview: true,
  ConnectStepper: true
} as const

export const registrationDashboardStubs = {
  DashboardTodoSection: true,
  DashboardRentalSection: true,
  DashboardSupportingInfoSection: true,
  ConnectDashboardSection: true,
  DashboardSidebar: true,
  RegistrationSubmittedApplications: true
} as const

export function renewalNavigatePayload (applicationId?: string) {
  return {
    path: '/application',
    query: applicationId
      ? { renew: 'true', applicationId }
      : { renew: 'true' }
  }
}
