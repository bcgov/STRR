// https://ui.nuxt.com/components/modal#control-programmatically
import { ModalBase } from '#components'

export const useStrrModals = () => {
  const modal = useModal()
  const { t } = useI18n()
  const connectNav = useConnectNav()
  const config = useRuntimeConfig().public

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

  function openCreateAccountModal () {
    modal.open(ModalBase, {
      title: t('label.createNewAccount'),
      content: t('platform.text.onlyPremiumAccountModalContent'),
      actions: [
        { label: t('btn.cancel'), variant: 'outline', handler: () => close() },
        {
          label: t('label.contToCreateAccount'),
          handler: () =>
            navigateTo(connectNav.createAccountUrl(), {
              external: true,
              open: {
                target: '_blank'
              }
            })
        }
      ]
    })
  }

  function openConfirmDeclineTosModal () {
    modal.open(ModalBase, {
      title: t('modal.declineTos.title'),
      content: t('modal.declineTos.content'),
      actions: [
        { label: t('btn.cancel'), variant: 'outline', handler: () => close() },
        {
          label: t('modal.declineTos.declineBtn'),
          handler: () => navigateTo(config.declineTosRedirectUrl as string, { external: true })
        }
      ]
    })
  }

  function openPatchTosErrorModal () {
    modal.open(ModalBase, {
      error: {
        title: t('error.generic.title'),
        description: t('error.generic.description'),
        showContactInfo: true
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
    openAppSubmitError,
    openCreateAccountModal,
    openConfirmDeclineTosModal,
    openPatchTosErrorModal,
    close
  }
}
