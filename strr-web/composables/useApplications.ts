import axios from 'axios'
import { ApplicationStatusE } from '#imports'
import { ApplicationI } from '~/interfaces/application-i'

export const useApplications = () => {
  const apiURL = useRuntimeConfig().public.strrApiURL
  const axiosInstance = addAxiosInterceptors(axios.create())
  const { handlePaymentRedirect } = useFees()

  /**
   * Default sorting order for applications
   */
  const applicationStatusPriority: any = {
    [ApplicationStatusE.REJECTED]: 4,
    [ApplicationStatusE.APPROVED]: 3,
    [ApplicationStatusE.SUBMITTED]: 2
  }

  /**
   * Get all STR Applications from the API and sorts them by status and city.
   * If no applications are found, the user is redirected to the create account page.
   */
  const getApplications = async () => {
    const response = await axiosInstance.get<PaginatedApplicationsI>(`${apiURL}/applications`)

    if (response.data.total === 0) {
      navigateTo('/create-account')
    }

    return response.data.applications
      .sort(
        (a: ApplicationI, b: ApplicationI) =>
          applicationStatusPriority[a.header.status] ?? 1 - applicationStatusPriority[b.header.status] ?? 1
      )
      .sort((a: ApplicationI, b: ApplicationI) =>
        a.registration.unitAddress.city.localeCompare(b.registration.unitAddress.city)
      )
  }

  /**
   * Create a new STR Application and redirect user to the payment page.
   */
  const createApplication = async (
    userFirstName: string,
    userLastName: string,
    hasSecondaryContact: boolean,
    propertyType: string,
    ownershipType: string
  ) => {
    const formData: CreateAccountFormAPII = formStateToApi(
      formState,
      userFirstName,
      userLastName,
      hasSecondaryContact,
      propertyType,
      ownershipType
    )

    try {
      const response = await axiosInstance.post(`${apiURL}/applications`, { ...formData })
      const data = response?.data

      if (!data) {
        throw new Error('Invalid AUTH API response')
      }

      const { header } = data
      handlePaymentRedirect(header.paymentToken, header.id)

      return data
    } catch (error) {
      console.warn('Error creating account.')
      console.error(error)
    }
  }

  return {
    getApplications,
    createApplication
  }
}
