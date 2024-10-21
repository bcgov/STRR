export const useDownloadCertificate = () => {
  const { t } = useTranslation()
  const tRegistrationStatus = (translationKey: string) => t(`registrationStatus.${translationKey}`)
  const { getCertificate } = useRegistrations()

  const downloadCertificate = async (id: string) => {
    const file = await getCertificate(id)
    const link = document.createElement('a')
    const blob = new Blob([file], { type: 'application/pdf' })
    link.href = window.URL.createObjectURL(blob)
    link.target = '_blank'
    link.download = `${tRegistrationStatus('strrCertificate')}.pdf`
    document.body.appendChild(link)
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return {
    downloadCertificate
  }
}
