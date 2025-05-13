// https://ui.nuxt.com/components/modal#control-programmatically
import {
  ModalBase,
  ModalHelpRegisterStr,
  ModalInfoCollectionNotice,
  ModalErrorApplicationSubmit
} from '#components'

export const useStrrModals = () => {
  const modal = useModal()
  const t = useNuxtApp().$i18n.t
  const { handleExternalRedirect } = useConnectNav()
  const accountStore = useConnectAccountStore()
  const config = useRuntimeConfig().public

  function openAppSubmitError (e: unknown) {
    modal.open(ModalErrorApplicationSubmit, {
      // @ts-expect-error - actions prop is passed down from ModalInfoCollectionNotice -> ModalBase
      actions: [{ label: t('btn.close'), handler: () => close() }],
      error: e
    })
  }

  function openCreateAccountModal () {
    const connectNav = useConnectNav()
    modal.open(ModalBase, {
      title: t('label.createNewAccount'),
      content: t('strr.text.onlyPremiumAccountModalContent'),
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
    const keycloak = useKeycloak()
    modal.open(ModalBase, {
      title: t('modal.declineTos.title'),
      content: t('modal.declineTos.content'),
      actions: [
        { label: t('btn.cancel'), variant: 'outline', handler: () => close() },
        {
          label: t('modal.declineTos.declineBtn'),
          handler: () => {
            keycloak.logout(config.declineTosRedirectUrl as string)
          }
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

  function openConfirmSwitchAccountModal (newAccountId: string, localPath?: string) {
    modal.open(ModalBase, {
      title: t('modal.changeAccountConfirm.title'),
      content: t('modal.changeAccountConfirm.content'),
      actions: [
        {
          label: t('modal.changeAccountConfirm.leaveBtn'),
          handler: async () => {
            accountStore.switchCurrentAccount(newAccountId)
            if (localPath) {
              await navigateTo(localPath)
              close()
            } else {
              handleExternalRedirect(config.registryHomeURL + 'dashboard')
            }
          }
        },
        {
          label: t('btn.cancel'),
          variant: 'outline',
          handler: () => modal.close()
        }
      ]
    })
  }

  function openHelpRegisterModal () {
    modal.open(ModalHelpRegisterStr, {
      // @ts-expect-error - actions prop is passed down from ModalHelpRegisterStr -> ModalBase
      actions: [{ label: t('btn.close'), handler: () => close() }]
    })
  }

  function openInfoCollectionNoticeModal () {
    modal.open(ModalInfoCollectionNotice, {
      // @ts-expect-error - actions prop is passed down from ModalInfoCollectionNotice -> ModalBase
      actions: [{ label: t('btn.close'), handler: () => close() }]
    })
  }

  function openErrorModal (title: string, description: string, showContactInfo: boolean) {
    modal.open(ModalBase, {
      error: {
        title,
        description,
        showContactInfo
      },
      actions: [
        { label: t('btn.close'), handler: () => close() }
      ]
    })
  }

  /**
   * Open a confirmation action modal. Could be used for any action, eg. Approve Application.
   *
   * @param {string} title - title of the modal
   * @param {string} content - content/description displayed in the modal
   * @param {string} confirmButtonLabel - label for the confirm button
   * @param {string} cancelButtonLabel - label for the cancel button
   * @param {function} confirmHandler - function to be called when the confirm button is clicked
   * @param {boolean} hideCancelButton - optional parameter to hide the cancel button
   */
  function openConfirmActionModal (
    title: string,
    content: string,
    confirmButtonLabel: string,
    cancelButtonLabel: string,
    confirmHandler: () => Promise<void>,
    hideCancelButton?: boolean
  ) {
    const modalActions: { label: string; variant?: string; handler: () => void }[] = [
      { label: confirmButtonLabel, handler: () => confirmHandler() }
    ]
    if (!hideCancelButton) {
      modalActions.unshift({ label: cancelButtonLabel, variant: 'outline', handler: () => close() })
    }

    modal.open(ModalBase, {
      title,
      content,
      actions: modalActions
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
    openConfirmSwitchAccountModal,
    openHelpRegisterModal,
    openInfoCollectionNoticeModal,
    openErrorModal,
    openConfirmActionModal,
    close
  }
}
