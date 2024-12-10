// https://ui.nuxt.com/components/modal#control-programmatically

import {
//   ModalBase,
} from '#components'

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
