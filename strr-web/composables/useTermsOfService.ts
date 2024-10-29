import axios from 'axios'

/**
 * Composable to manage Terms of Service (ToS) checks and user acceptance.
 */
export const useTermsOfService = () => {
  const DECLINE_TERMS_REDIRECT_URL = 'https://www2.gov.bc.ca/gov/content/housing-tenancy/short-term-rentals/registry'

  const strrApiURL = useRuntimeConfig().public.strrApiURL
  const axiosInstance = addAxiosInterceptors(axios.create())
  const { tos, isTosAccepted } = storeToRefs(useBcrosAccount())

  async function checkTermsOfService (): Promise<boolean> {
    let isAccepted = false
    // if ToS is already loaded, check acceptance status
    // this prevents multiple fetch calls to get ToS
    if (tos.value) {
      return handleTosAcceptance(tos.value.isTermsOfUseAccepted)
    }

    try {
      // fetch ToS data if not already loaded
      const { data } = await axiosInstance.get<TermsOfServiceI>(`${strrApiURL}/users/tos`)
      tos.value = data // Update the tos state

      // handle acceptance status after fetching
      isAccepted = handleTosAcceptance(data.isTermsOfUseAccepted)
    } catch (error) {
      console.error('Error fetching Terms Of Service:', error)
    }
    return isAccepted
  }

  function handleTosAcceptance (isAccepted: boolean): boolean {
    if (isAccepted) {
      isTosAccepted.value = true
      return true
    }
    return false
  }

  async function acceptTermsOfService (isAccepted: boolean, versionId: string): Promise<void> {
    try {
      await axiosInstance
        .patch<TermsOfServiceI>(`${strrApiURL}/users/tos`, {
          istermsaccepted: isAccepted,
          termsversion: versionId
        })
      await useBcrosAccount().setAccountInfo()
      if (isAccepted) {
        navigateTo('/' + RouteNamesE.ACCOUNT_SELECT)
      } else {
        navigateTo(DECLINE_TERMS_REDIRECT_URL, { external: true })
      }
    } catch (error) {
      console.error('Error accepting Terms Of Service:', error)
    }
  }

  return {
    checkTermsOfService,
    acceptTermsOfService
  }
}
