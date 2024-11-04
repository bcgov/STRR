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
      title: 'Decline Terms of Use?',
      content: 'By declining the Terms of Use, you won’t be able to access this service. Do you wish to proceed?',
      actions: [
        { label: t('btn.cancel'), variant: 'outline', handler: () => close() },
        {
          label: 'Decline Terms of Use',
          handler: () => navigateTo(config.declineTosRedirectUrl as string, { external: true })
        }
      ]
    })
  }

  function openPatchTosErrorModal () {
    modal.open(ModalBase, {
      error: {
        title: 'Unable to accept the Terms of Use.',
        description: 'An unexpected error occured, please try again later.'
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
