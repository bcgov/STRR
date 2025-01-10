import { HostActions } from '~/enums/host-actions'

// TODO: host actions enums
export const getTodoApplication = (
  applicationPath: string,
  payRedirectPath: string,
  applicationInfo?: ApplicationHeader
) => {
  // NOTE: even though this function is called within 'setup', useNuxtApp is required for the app context
  const { t } = useNuxtApp().$i18n
  const localePath = useLocalePath()
  const todos = []

  if (!applicationInfo) {
    todos.push({
      title: t('strr.title.application'),
      subtitle: undefined,
      button: {
        label: t('btn.beginApplication'),
        action: async () => {
          await navigateTo(localePath(applicationPath))
        }
      }
    })
  } else if (applicationInfo?.status === ApplicationStatus.DRAFT) {
    todos.push({
      title: t('strr.title.application'),
      // NOTE: currently this status could only ever be DRAFT as there is no review process for platforms
      subtitle: applicationInfo.status,
      button: {
        label: t('btn.resumeApplication'),
        action: async () => {
          if (applicationInfo) { // TODO: alert if no application info
          // pass application number so that the application form can load in the saved data
            await navigateTo(
              {
                path: localePath(applicationPath),
                query: { override: 'true', applicationId: applicationInfo.applicationNumber }
              }
            )
          }
        }
      }
    })
  } else if (applicationInfo?.hostActions.includes(HostActions.SUBMIT_PAYMENT)) { // TODO: handle other host actions
    const { handlePaymentRedirect } = useConnectNav()
    todos.push({
      title: t('label.completePayment'),
      subtitle: undefined, // TODO: add subtitle ?
      button: {
        label: t('label.payNow'), // TODO: alert if no application info
        action: () => // TODO: how to complete payment for PAD accounts?
          handlePaymentRedirect(applicationInfo.paymentToken, payRedirectPath)
      }
    })
  }

  return todos
}
