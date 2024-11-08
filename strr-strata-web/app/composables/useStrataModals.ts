// https://ui.nuxt.com/components/modal#control-programmatically
import {
  ModalBase,
  ModalHelpRegisterStrataHotel,
  ModalInfoCollectionNotice
} from '#components'

export const useStrataModals = () => {
  const modal = useModal()
  const { t } = useI18n()

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

  function openInfoCollectionNoticeModal () {
    modal.open(ModalInfoCollectionNotice, {
      actions: [{ label: t('btn.close'), handler: () => close() }]
    })
  }

  function close () {
    modal.close()
  }

  return {
    openhelpRegisteringStrataModal,
    openHelpRegisterStrataHotelModal,
    openInfoCollectionNoticeModal,
    close
  }
}
