// https://ui.nuxt.com/components/modal#control-programmatically
import {
  ModalBase,
  ModalHelpRegisterStrataHotel
} from '#components'

export const useHostPmModals = () => {
  const modal = useModal()
  const { t } = useI18n()

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

  function close () {
    modal.close()
  }

  return {
    openhelpRegisteringStrataModal,
    openHelpRegisterStrataHotelModal,
    openHelpCreateAccountModal,
    close
  }
}
