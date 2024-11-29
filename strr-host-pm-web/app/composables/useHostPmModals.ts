// https://ui.nuxt.com/components/modal#control-programmatically
import {
  ModalBase
} from '#components'

export const useHostPmModals = () => {
  const modal = useModal()
  const { t } = useI18n()
  const reqStore = usePropertyReqStore()
  const propStore = useHostPropertyStore()

  function openHelpCreateAccountModal () {
    modal.open(ModalBase, {
      title: t('modal.createAccount.title'),
      content: t('modal.createAccount.content'),
      error: { showContactInfo: true, title: '', description: '', hideIcon: true },
      actions: [{ label: t('btn.close'), handler: () => close() }]
    })
  }

  // TODO reset stepper 'isComplete' when application state being reset
  function openConfirmRestartApplicationModal (edit = true) { // maybe update edit param for different actions
    modal.open(ModalBase, {
      title: edit ? t('modal.editUnitAddress.title') : t('modal.removeUnitAddress.title'),
      content: edit ? t('modal.editUnitAddress.content') : t('modal.removeUnitAddress.content'),
      actions: [
        {
          label: t('btn.cancel'),
          handler: () => close(),
          variant: 'outline'
        },
        {
          label: edit ? t('modal.editUnitAddress.confirmBtn') : t('modal.removeUnitAddress.confirmBtn'),
          handler: () => {
            reqStore.$reset()
            propStore.$reset()
            close()
          } // TODO: reset other form state as well ?
        }
      ]
    })
  }

  function close () {
    modal.close()
  }

  return {
    openHelpCreateAccountModal,
    openConfirmRestartApplicationModal,
    close
  }
}
