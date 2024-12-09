// https://ui.nuxt.com/components/modal#control-programmatically

// currently no unique strata modals
// import {
//   ModalBase,
//   ModalHelpRegisterStrataHotel
// } from '#components'

export const useStrataModals = () => {
  const modal = useModal()
  // const { t } = useI18n()

  function close () {
    modal.close()
  }

  return {
    close
  }
}
