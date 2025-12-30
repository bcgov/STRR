// https://ui.nuxt.com/components/modal#control-programmatically

import {
  ModalBase
} from '#components'

export const useStrataModals = () => {
  const modal = useModal()
  const { t } = useNuxtApp().$i18n

  function openStrataDocUploadErrorModal (errors: Array<{ file: File, reason: 'fileType' | 'fileSize' }>) {
    let title: string = ''
    let description: string = ''

    if (errors.length === 0) {
      return
    }

    if (errors.length === 1) {
      title = t(`error.docUpload.${errors[0]?.reason}.title`)
      description = t(`error.docUpload.${errors[0]?.reason}.description`)
    } else {
      title = t('error.docUpload.generic.title')
      description = t('error.docUpload.generic.description')
    }

    modal.open(ModalBase, {
      error: {
        title,
        description,
        showContactInfo: false
      },
      actions: [
        { label: t('btn.close'), handler: () => close() }
      ]
    })
  }

  function close () {
    modal.close()
  }

  return {
    openStrataDocUploadErrorModal,
    close
  }
}
