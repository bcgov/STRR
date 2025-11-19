import { DateTime } from 'luxon'
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
      buttons: [{
        label: t('btn.beginApplication'),
        action: async () => {
          await navigateTo(localePath(applicationPath))
        }
      }]
    })
  } else if (applicationInfo?.status === ApplicationStatus.DRAFT) {
    todos.push({
      id: 'todo-resume-app',
      title: t('strr.title.application'),
      // NOTE: currently this status could only ever be DRAFT as there is no review process for platforms
      subtitle: applicationInfo.status,
      buttons: [{
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
      }]
    })
  } else if (
    applicationInfo?.hostActions.includes(HostActions.SUBMIT_PAYMENT) &&
    applicationInfo?.applicationType !== 'renewal'
  ) { // TODO: handle other host actions, exclude renewal applications
    const { handlePaymentRedirect } = useConnectNav()
    todos.push({
      id: 'todo-complete-payment',
      title: t('label.completePayment'),
      subtitle: undefined, // TODO: add subtitle ?
      buttons: [{
        label: t('label.payNow'), // TODO: alert if no application info
        action: () => // TODO: how to complete payment for PAD accounts?
          handlePaymentRedirect(applicationInfo.paymentToken, payRedirectPath)
      }]
    })
  }

  if (applicationInfo?.status === ApplicationStatus.NOC_PENDING ||
    applicationInfo?.status === ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING
  ) {
    const nocEndDate = dateToString(applicationInfo!.nocEndDate as Date, 'DDD')
    const isHost = applicationType === ApplicationType.HOST
    const isProvisional = applicationInfo?.status === ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING

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
      title: `${t('todos.noc.title1')} ${nocEndDate} ${t('todos.noc.title2')}`,
      subtitle: `${t('todos.noc.general', translationProps)}${isHost ? t('todos.noc.host', translationProps) : ''}`
    }

    const provisionalNocTodo: Todo = {
      id: 'todo-provisional-noc-add-docs',
      title: `${t('todos.provisionalNoc.title1')} ${nocEndDate} ${t('todos.provisionalNoc.title2')}`,
      subtitle: `${t('todos.provisionalNoc.general',
        translationProps)}${isHost ? t('todos.provisionalNoc.host', translationProps) : ''}`
    }

    todos.push(isProvisional ? provisionalNocTodo : nocTodo)
  }

  return todos
}

export const getTodoRegistration = async (regId: number) => {
  const { getRegistrationToDos } = useStrrApi()

  const { todos } = await getRegistrationToDos(regId)

  // check if todos have a renewable registration
  const hasRenewalTodo: boolean = todos
    .some(todo => todo?.task?.type === RegistrationTodoType.REGISTRATION_RENEWAL)

  return {
    hasRenewalTodo
  }
}

// Get information for Renewal Todo: due date, overdue status, etc.
export const getTodoRenewalInfo = (expiryDate: Date | string): {
  isOverdue: boolean
  renewalDueDate: string
  countdownLabel: string
} => {
  const { t } = useNuxtApp().$i18n

  const isoDate = expiryDate instanceof Date ? expiryDate.toISOString() : expiryDate

  const expDate = DateTime.fromISO(isoDate).setZone('America/Vancouver')

  // convert expiry date to medium format date, eg Apr 1, 2025
  const renewalDueDate = expDate.toLocaleString(DateTime.DATE_MED)
  const today = DateTime.now().setZone('America/Vancouver')

  // number of days for renewal due date
  const daysToRenew = Math.floor(expDate.diff(today, 'days').toObject().days!)

  const isOverdue = daysToRenew < 0

  // label for the due days count
  const countdownLabel = isOverdue
    ? t('label.renewalOverdue')
    : t('label.renewalDayCount', daysToRenew)

  return {
    isOverdue,
    renewalDueDate,
    countdownLabel
  }
}
