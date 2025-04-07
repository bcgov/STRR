import { HostActions } from '~/enums/host-actions'

// TODO: host actions enums
export const getTodoApplication = (
  applicationPath: string,
  payRedirectPath: string,
  applicationInfo?: ApplicationHeader,
  applicationType?: ApplicationType
) => {
  // NOTE: even though this function is called within 'setup', useNuxtApp is required for the app context
  const { t } = useNuxtApp().$i18n
  const localePath = useLocalePath()
  const todos = []

  if (!applicationInfo) {
    todos.push({
      id: 'todo-begin-app',
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
      id: 'todo-resume-app',
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
      id: 'todo-complete-payment',
      title: t('label.completePayment'),
      subtitle: undefined, // TODO: add subtitle ?
      button: {
        label: t('label.payNow'), // TODO: alert if no application info
        action: () => // TODO: how to complete payment for PAD accounts?
          handlePaymentRedirect(applicationInfo.paymentToken, payRedirectPath)
      }
    })
  }

  if (applicationInfo?.status === ApplicationStatus.NOC_PENDING) {
    const nocEndDate = dateToStringPacific(applicationInfo!.nocEndDate as Date, 'DDD')
    const isHost = applicationType === ApplicationType.HOST

    const translationProps = {
      newLine: '<br/>',
      boldStart: '<strong>',
      boldEnd: '</strong>',
      linkStart: "<button type='button'" +
        "onClick=\"document.getElementById('summary-supporting-info').scrollIntoView({ behavior: 'smooth' })\"" +
        "class='text-blue-500 underline'>",
      linkEnd: '</button>'
    }

    const nocTodo: Todo = {
      id: 'todo-noc-add-docs',
      title: `${t('todos.noc.title1')}${nocEndDate}${t('todos.noc.title2')}`,
      subtitle: `${t('todos.noc.general', translationProps)}${isHost ? t('todos.noc.host', translationProps) : ''}`
    }

    todos.push(nocTodo)
  }

  return todos
}
