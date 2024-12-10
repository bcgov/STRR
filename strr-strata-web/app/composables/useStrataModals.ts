// https://ui.nuxt.com/components/modal#control-programmatically

// currently no unique strata modals
import {
//   ModalBase,
  ModalErrorApplicationSubmit
} from '#components'

export const useStrataModals = () => {
  const modal = useModal()
  // const { t } = useI18n()

  function openApplicationSubmitErrorModal (e: unknown) {
    modal.open(ModalErrorApplicationSubmit, {
      error: e
    })
  }

  function close () {
    modal.close()
  }

  return {
    openApplicationSubmitErrorModal,
    close
  }
}
