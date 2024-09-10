import axios from 'axios'
import { StatusCodes } from 'http-status-codes'
import { defineStore } from 'pinia'
import { AccountI, MeI } from '~/interfaces/account-i'
import { ErrorCategoryE } from '~/enums/error-category-e'
import { ErrorI } from '~/interfaces/error-i'
import { KCUserI } from '~/interfaces/kc-user-i'
import { addAxiosInterceptors } from '~/utils/axios'
import { TermsOfServiceI } from '~/interfaces/terms-of-service-i'

/** Manages bcros account data */
export const useBcrosAccount = defineStore('bcros/account', () => {
  // keycloak info
  const keycloak = useBcrosKeycloak()
  const tosAccepted = ref(false)
  const tos = ref<TermsOfServiceI>()
  // selected user account
  const currentAccount: Ref<AccountI> = ref({} as AccountI)
  const currentAccountName = computed((): string => currentAccount.value?.label || '')
  // user info
  const user = computed(() => keycloak.kcUser)
  const userAccounts: Ref<AccountI[]> = ref([])
  const userOrgs: Ref<OrgI[]> = ref([])
  const activeUserAccounts = computed(() => {
    return userAccounts.value.filter(account => account.accountStatus === AccountStatusE.ACTIVE)
  })
  const me: Ref<MeI | undefined> = ref()
  const userFirstName: Ref<string> = ref(user.value?.firstName || '-')
  const userLastName: Ref<string> = ref(user.value?.lastName || '')
  const userFullName = computed(() => `${userFirstName.value} ${userLastName.value}`)
  // errors
  const errors: Ref<ErrorI[]> = ref([])
  // api request variables
  const axiosInstance = addAxiosInterceptors(axios.create())
  const apiURL = useRuntimeConfig().public.authApiURL
  const strrApiURL = useRuntimeConfig().public.strrApiURL

  /** Get user information from AUTH */
  async function getAuthUserProfile (identifier: string) {
    return await axiosInstance.get<KCUserI | void>(`${apiURL}/users/${identifier}`)
      .then((response) => {
        const data = response?.data
        if (!data) { throw new Error('Invalid AUTH API response') }
        return data
      })
      .catch((error) => {
        console.warn('Error fetching user info.')
        errors.value.push({
          statusCode: error?.response?.status || StatusCodes.INTERNAL_SERVER_ERROR,
          message: error?.response?.data?.message,
          category: ErrorCategoryE.USER_INFO
        })
      })
  }

  /** Update user information in AUTH with current token info */
  async function updateAuthUserInfo () {
    return await axiosInstance.post<KCUserI | void>(`${apiURL}/users`, { isLogin: true })
      .then(response => response.data)
      .catch((error) => {
        // not too worried if this errs -- log for ops
        console.error('Error updating Auth with login attempt', error)
      })
  }

  async function updateTosAcceptance (): Promise<TermsOfServiceI | void> {
    return await axiosInstance.get<TermsOfServiceI>(`${apiURL}/documents/termsofuse`)
      .then((response) => {
        tos.value = response.data
        return response.data
      })
  }

  async function acceptTos (acceptance: boolean, versionId: string): Promise<TermsOfServiceI | void> {
    return await axiosInstance.patch<TermsOfServiceI>(`${strrApiURL}/users/tos`,
      {
        istermsaccepted: acceptance,
        termsversion: versionId
      }
    )
      .then(() => {
        setAccountInfo()
          .then(() => {
            if (acceptance) {
              navigateTo('/create-account')
            } else {
              navigateTo('/')
            }
          })
      })
  }

  /** Set user name information */
  async function setUserName () {
    if (user.value?.loginSource === LoginSourceE.BCEID) {
      // get from auth
      const authUserInfo = await getAuthUserProfile('@me')
      if (authUserInfo) {
        userFirstName.value = authUserInfo.firstName
        userLastName.value = authUserInfo.lastName
      }
      return
    }
    userFirstName.value = user.value?.firstName || '-'
    userLastName.value = user.value?.lastName || ''
  }

  /** Get me object for this user from STRR api */
  // TODO: TC - move this to an STRR store
  async function getMe () {
    const apiURL = useRuntimeConfig().public.strrApiURL
    return await axiosInstance.get(`${apiURL}/accounts`)
      .then((response) => {
        const data = response?.data as MeI
        if (!data) { throw new Error('Invalid STRR API response') }
        me.value = data as MeI
        return data as MeI
      })
      .catch((error) => {
        console.warn('Error fetching me object.')
        errors.value.push({
          statusCode: error?.response?.status || StatusCodes.INTERNAL_SERVER_ERROR,
          message: error?.response?.data?.message,
          category: ErrorCategoryE.ME
        })
      })
  }

  /** Get the user's account list */
  async function getUserAccounts (keycloakGuid: string) {
    const apiURL = useRuntimeConfig().public.authApiURL
    return await axiosInstance.get<UserSettingsI[]>(`${apiURL}/users/${keycloakGuid}/settings`)
      .then((response) => {
        const data = response?.data
        if (!data) { throw new Error('Invalid AUTH API response') }
        return data.filter(userSettings => (userSettings.type === UserSettingsTypeE.ACCOUNT)) as AccountI[]
      })
      .catch((error) => {
        console.warn('Error fetching user settings / account list.')
        errors.value.push({
          statusCode: error?.response?.status || StatusCodes.INTERNAL_SERVER_ERROR,
          message: error?.response?.data?.message,
          category: ErrorCategoryE.ACCOUNT_LIST
        })
      })
  }

  /** Set the user account list and current account */
  async function setAccountInfo (currentAccountId?: string) {
    if (!currentAccountId) {
      // try getting id from existing session storage
      currentAccountId = JSON.parse(sessionStorage.getItem(SessionStorageKeyE.CURRENT_ACCOUNT) || '{}').id
    }

    // Retrieve the user session from session storage
    const storedUserProfile: MeI = JSON.parse(sessionStorage.getItem(SessionStorageKeyE.USER_PROFILE) || 'null')

    if (user.value?.keycloakGuid) {
      // Set user accounts from stored user profile settings or fetch from API if not available
      userAccounts.value =
        (storedUserProfile?.settings?.filter(settings => settings.type === UserSettingsTypeE.ACCOUNT) as AccountI[]) ||
        (await getUserAccounts(user.value?.keycloakGuid)) ||
        []

      if (userAccounts && userAccounts.value.length > 0) {
        currentAccount.value = userAccounts.value[0]
        if (currentAccountId) {
          // if previous current account id selection information available set this as current account
          currentAccount.value = userAccounts.value.find(account => account.id === currentAccountId) || {} as AccountI
        }
        sessionStorage.setItem(SessionStorageKeyE.CURRENT_ACCOUNT, JSON.stringify(currentAccount.value))
      }

      // Set Me and UserOrgs refs from stored user profile or fetch from the API
      if (storedUserProfile) {
        me.value = storedUserProfile
        userOrgs.value = storedUserProfile.orgs
      } else {
        const myUserProfile = await getMe()
        if (myUserProfile) {
          userOrgs.value = myUserProfile.orgs || []
          sessionStorage.setItem(SessionStorageKeyE.USER_PROFILE, JSON.stringify(myUserProfile))
        }
      }
    }
  }

  /** Switch the current account to the given account ID if it exists in the user's account list */
  function switchCurrentAccount (accountId: string) {
    for (const i in userAccounts.value) {
      if (userAccounts.value[i].id === accountId) {
        currentAccount.value = userAccounts.value[i]
      }
    }
    sessionStorage.setItem(SessionStorageKeyE.CURRENT_ACCOUNT, JSON.stringify(currentAccount.value))
  }

  return {
    axiosInstance,
    me,
    tos,
    acceptTos,
    tosAccepted,
    currentAccount,
    currentAccountName,
    userAccounts,
    userOrgs,
    activeUserAccounts,
    userFullName,
    errors,
    userFirstName,
    userLastName,
    updateAuthUserInfo,
    updateTosAcceptance,
    setUserName,
    setAccountInfo,
    switchCurrentAccount
  }
})
