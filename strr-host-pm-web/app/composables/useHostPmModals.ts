// https://ui.nuxt.com/components/modal#control-programmatically
import {
  ModalBase
} from '#components'
import PlatformRegNumHelp from '~/components/modal/info/PlatformRegNumHelp.vue'

export const useHostPmModals = () => {
  const modal = useModal()
  const { t } = useI18n()
  const reqStore = usePropertyReqStore()
  const propStore = useHostPropertyStore()
  const docStore = useDocumentStore()

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
          handler: async () => {
            reqStore.$reset()
            propStore.$reset()
            await docStore.resetApiDocs()
            close()
          } // TODO: reset other form state as well ?
        }
      ]
    })
  }

  function openStrataRegNumberHelpModal () {
    modal.open(PlatformRegNumHelp, {
      // @ts-expect-error - actions prop is passed down from PlatformRegNumHelp -> ModalBase
      actions: [{
        label: t('modal.strataPlatformNumHelp.closeBtn'),
        handler: () => close()
      }]
    })
  }

  function openConfirmUnsavedChanges () {
    return new Promise<boolean>((resolve) => {
      const resolveAndClose = (value: boolean) => {
        resolve(value)
        close()
      }

      const modalActions = [
        {
          label: t('modal.unsavedChanges.confirmBtn'),
          variant: 'outline',
          handler: () => resolveAndClose(true)
        },
        {
          label: t('modal.unsavedChanges.closeBtn'),
          variant: 'solid',
          handler: () => resolveAndClose(false)
        }
      ]

      modal.open(ModalBase, {
        title: t('modal.unsavedChanges.title'),
        content: t('modal.unsavedChanges.content'),
        actions: modalActions
      })
    })
  }

  function close () {
    modal.close()
  }

  return {
    openHelpCreateAccountModal,
    openConfirmRestartApplicationModal,
    openStrataRegNumberHelpModal,
    openConfirmUnsavedChanges,
    close
  }
}
