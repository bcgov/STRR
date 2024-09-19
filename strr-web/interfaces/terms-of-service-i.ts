export interface TermsOfServiceI {
  isTermsOfUseAccepted: boolean
  termsOfUseAcceptedVersion: string
  termsOfUseCurrentVersion?: string
  termsOfUse?: string
}
