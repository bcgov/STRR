import axios from 'axios'

export const useFees = () => {
  const apiURL = useRuntimeConfig().public.strrApiURL
  const axiosInstance = addAxiosInterceptors(axios.create())
  const config = useRuntimeConfig()
  const payApiURL = useRuntimeConfig().public.payApiURL

  /**
   * Fetches the Host Rental Application fee.
   *
   * @returns {Promise<FeeI | undefined>} Fee data or undefined if an error occurs.
   */
  const getHostApplicationFee = async (): Promise<FeeI | undefined> => {
    try {
      const { data } = await axiosInstance.get<FeeI>(`${payApiURL}/fees/STRR/RENTAL_FEE`)
      return data
    } catch (error) {
      console.error('Error fetching Host Application Fee: ', error)
    }
  }

  /**
   * Fetches the Platform Application fee based on Platform size (SM or LG).
   *
   * @param {('SM' | 'LG')} type - The size of platform application fee to fetch:
   *  small - 'SM', large - 'LG' .
   * @returns {Promise<FeeI | undefined>} Fee data or undefined if an error occurs.
   */
  const getPlatformApplicationFee = async (type: 'SM' | 'LG'): Promise<FeeI | undefined> => {
    try {
      const { data } = await axiosInstance.get<FeeI>(`${payApiURL}/fees/STRR/PLATREG_${type}`)
      return data
    } catch (error) {
      console.error(`Error fetching Platform Application Fee (${type}): `, error)
    }
  }

  // Wrapper function to get Application fee for Small Platform (<1000 listings)
  const getSmallPlatformApplicationFee = () => getPlatformApplicationFee('SM')

  // Wrapper function to get Application fee for Large Platform (>1000 listings)
  const getLargePlatformApplicationFee = () => getPlatformApplicationFee('LG')

  const createInvoiceRecord = (invoiceId: string, applicationId: string) => {
    axiosInstance.post(`${apiURL}/registrations/${applicationId}/invoice/${invoiceId}/paid`)
  }

  const handlePaymentRedirect = async (invoiceId: number, applicationId: number) => {
    const paymentUrl = config.public.authWebURL + 'makepayment'
    const returnUrl = encodeURIComponent(
      `${window.location.href.replace('create-account', `success/${applicationId}/invoice/${invoiceId}`)}`
    )
    const payUrl = `${paymentUrl}/${invoiceId}/${returnUrl}`
    await navigateTo(payUrl, { external: true })
  }

  return {
    createInvoiceRecord,
    getHostApplicationFee,
    getSmallPlatformApplicationFee,
    getLargePlatformApplicationFee,
    handlePaymentRedirect
  }
}
