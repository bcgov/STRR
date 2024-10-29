export const useDownloadReceipt = () => {
  const { t } = useTranslation()
  const tRegistrationStatus = (translationKey: string) => t(`registrationStatus.${translationKey}`)
  const { getReceipt } = useApplications()
  const downloadingReceipts = ref<Set<string>>(new Set())

  const downloadReceipt = async (appNum: string) => {
    if (downloadingReceipts.value.has(appNum)) {
      return
    }
    downloadingReceipts.value.add(appNum)
    try {
      const pdfBlob = await getReceipt(appNum)
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(pdfBlob)
      link.target = '_blank'
      link.download = `${tRegistrationStatus('strrReceipt')}.pdf`
      document.body.appendChild(link)
      link.click()
      URL.revokeObjectURL(link.href)
    } finally {
      downloadingReceipts.value.delete(appNum)
    }
  }

  return {
    downloadReceipt,
    downloadingReceipts
  }
}
