// https://ui.nuxt.com/components/modal#control-programmatically
import { ModalBase } from '#components'

export const useStrrModals = () => {
  const modal = useModal()
  const { t } = useI18n()

  function openAppSubmitError (e: any) {
    modal.open(ModalBase, {
      error: {
        title: 'Error submitting application', // need to come up with different error messages for different scenarios
        description: 'Some description here.'
      },
      content: e.data?.message ?? undefined,
      actions: [{ label: t('btn.close'), handler: () => close() }]
    })
  }

  function close () {
    modal.close()
  }

  return {
    openAppSubmitError,
    close
  }
}
