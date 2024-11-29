// https://ui.nuxt.com/components/modal#control-programmatically
import {
  ModalBase,
  ModalHelpRegisterStrataHotel
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

  function openhelpRegisteringStrataModal () {
    modal.open(ModalBase, {
      title: t('modal.helpRegisteringStrata.title'),
      content: t('modal.helpRegisteringStrata.content'),
      actions: [{ label: t('btn.close'), handler: () => close() }]
    })
  }

  // might change the above modal to match this one
  function openHelpRegisterStrataHotelModal () {
    modal.open(ModalHelpRegisterStrataHotel, {
      actions: [{ label: t('btn.close'), handler: () => close() }]
    })
  }

  // TODO: update text when we get design, add different text for 'remove' option?
  // TODO reset stepper 'isComplete' when application state being reset
  function openConfirmRestartApplicationModal () {
    modal.open(ModalBase, {
      title: 'Edit Rental Unit Address?',
      content: 'Making any changes to the current rental unit address will reset the application, any progress you have will be lost. Would you like to continue?',
      actions: [
        { label: t('btn.cancel'), handler: () => close() },
        {
          label: 'Edit Address',
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
    openhelpRegisteringStrataModal,
    openHelpRegisterStrataHotelModal,
    openHelpCreateAccountModal,
    openConfirmRestartApplicationModal,
    close
  }
}
