import type { KeycloakConfig } from 'keycloak-js'
import { isEmpty } from 'lodash'

/** Manages auth flows */
export const useBcrosAuth = () => {
  const config = useRuntimeConfig()
  const keycloak = useBcrosKeycloak()
  const account = useBcrosAccount()
  const {
    redirect,
    goToSetupAccount,
    goToCreateAccount,
    goToAccountSelect,
    goToTermsOfService,
    goToCreateSbcAccount,
    goToExaminerDashboard
  } = useBcrosNavigate()
  const { checkTermsOfService } = useTermsOfService()

  const { currentAccount, userOrgs, userAccounts } = storeToRefs(account)

  /** redirect to the correct creation screen based on auth state */
  function createAccount () {
    if (keycloak.kc.authenticated) {
      goToSetupAccount()
    } else {
      goToCreateAccount()
    }
  }

  /** Logout and then redirect to given page (if redirect provided). */
  async function logout (redirect: string) {
    await keycloak.logout(redirect)
  }

  /** redirect if account status is suspended */
  function verifyAccountStatus () {
    const accountStatus = account.currentAccount?.accountStatus
    if (accountStatus) {
      if ([AccountStatusE.NSF_SUSPENDED, AccountStatusE.SUSPENDED].includes(accountStatus)) {
        redirect(`${config.public.authWebURL}/account-freeze`)
      } else if (accountStatus === AccountStatusE.PENDING_STAFF_REVIEW) {
        const accountName = encodeURIComponent(btoa(account.currentAccountName || ''))
        redirect(`${config.public.authWebURL}/pendingapproval/${accountName}/true`)
      }
    }
  }

  /** Setup keycloak / user auth pieces */
  async function setupAuth (kcConfig: KeycloakConfig, currentAccountId?: string) {
    if (!keycloak.kc.authenticated) {
      try {
        console.info('Initializing auth setup...')
        // initialize keycloak with user token
        console.info('Initializing Keycloak...')
        await keycloak.initKeyCloak(kcConfig)
        if (keycloak.kc.authenticated) {
          // successfully initialized so setup other pieces
          keycloak.syncSessionStorage()
          keycloak.scheduleRefreshToken()
          // set user and account info
          console.info('Setting user account information...')
          const accountInfoPromise = account.setAccountInfo(currentAccountId)
          const userNamePromise = account.setUserName()

          // Wait for all promises to resolve
          await Promise.all([accountInfoPromise, userNamePromise])

          // check account status
          console.info('Checking account status...')
          // verify account status
          verifyAccountStatus()

          // do not show Terms for IDIR users (Examiners)
          if (!keycloak.isExaminer) {
            const isToSAccepted = await checkTermsOfService()
            // if Terms not accepted - redirect TOS page
            if (!isToSAccepted) {
              goToTermsOfService()
              return
            }
          }

          // if user has not picked an account - go to Account Select
          // Examiners will skip the account select page
          if (isEmpty(currentAccount.value) && userOrgs.value.length > 0 && !keycloak.isExaminer) {
            goToAccountSelect()
            return
          } else if (keycloak.isExaminer && userOrgs.value.length === 1) {
            currentAccount.value = userAccounts.value[0]
            sessionStorage.setItem(SessionStorageKeyE.CURRENT_ACCOUNT, JSON.stringify(userAccounts.value[0]))
            // redirect Examiner to Dashboard
            goToExaminerDashboard()
          }

          // if user has no accounts - go to account finalization page
          if (userOrgs.value.length === 0) {
            goToCreateSbcAccount()
          }

          console.info('Auth setup complete.')
        }
      } catch (error) {
        console.warn('Keycloak initialization failed:', error)
      }
    }
  }

  return {
    createAccount,
    logout,
    setupAuth
  }
}
