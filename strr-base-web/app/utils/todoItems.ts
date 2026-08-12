import { DateTime } from 'luxon'
import { HostActions } from '~/enums/host-actions'

const RENEWAL_CLOSED_THRESHOLD_YEARS = 3

const NOC_STATUSES = new Set<ApplicationStatus>([
  ApplicationStatus.NOC_PENDING,
  ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING,
  ApplicationStatus.NOC_EXPIRED,
  ApplicationStatus.PROVISIONAL_REVIEW_NOC_EXPIRED
])

const PROVISIONAL_NOC_STATUSES = new Set<ApplicationStatus>([
  ApplicationStatus.PROVISIONAL_REVIEW_NOC_PENDING,
  ApplicationStatus.PROVISIONAL_REVIEW_NOC_EXPIRED
])

const EXPIRED_NOC_STATUSES = new Set<ApplicationStatus>([
  ApplicationStatus.NOC_EXPIRED,
  ApplicationStatus.PROVISIONAL_REVIEW_NOC_EXPIRED
])

const NOC_TRANSLATION_PROPS = {
  newLine: '<br/>',
  boldStart: '<strong>',
  boldEnd: '</strong>',
  linkStart: "<button type='button'" +
    "onClick=\"document.getElementById('summary-supporting-info').scrollIntoView({ behavior: 'smooth' })\"" +
    "class='text-blue-500 underline'>",
  linkEnd: '</button>'
}

const toVancouverDateTime = (date: Date | string): DateTime => {
  const isoDate = date instanceof Date ? date.toISOString() : date
  return DateTime.fromISO(isoDate).setZone('America/Vancouver')
}

export const getTodoApplication = (
  applicationPath: string,
  payRedirectPath: string,
  applicationInfo?: ApplicationHeader,
  applicationType?: ApplicationType
): Todo[] => {
  const { t } = useNuxtApp().$i18n
  const localePath = useLocalePath()
  const todos: Todo[] = []

  // Case 1: Unstarted application
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
    return todos
  }

  // Case 2: Draft application (non-renewal)
  if (applicationInfo.status === ApplicationStatus.DRAFT && applicationInfo.applicationType !== 'renewal') {
    todos.push({
      id: 'todo-resume-app',
      title: t('strr.title.application'),
      subtitle: applicationInfo.status,
      buttons: [{
        label: t('btn.resumeApplication'),
        action: async () => {
          await navigateTo({
            path: localePath(applicationPath),
            query: { override: 'true', applicationId: applicationInfo.applicationNumber }
          })
        }
      }]
    })
    return todos
  }

  // Case 3: Payment submission required (non-renewal)
  if (
    applicationInfo.hostActions?.includes(HostActions.SUBMIT_PAYMENT) &&
    applicationInfo.applicationType !== 'renewal'
  ) {
    const { handlePaymentRedirect } = useConnectNav()
    todos.push({
      id: 'todo-complete-payment',
      title: t('label.completePayment'),
      subtitle: undefined,
      buttons: [{
        label: t('label.payNow'),
        action: () => handlePaymentRedirect(applicationInfo.paymentToken, payRedirectPath)
      }]
    })
    return todos
  }

  // Case 4: Notice of Consideration (Active or Expired)
  const status = applicationInfo.status
  if (status && NOC_STATUSES.has(status) && applicationInfo.nocEndDate) {
    const isProvisional = PROVISIONAL_NOC_STATUSES.has(status)
    const isExpired = EXPIRED_NOC_STATUSES.has(status)
    const isHost = applicationType === ApplicationType.HOST
    const prefix = isProvisional ? 'provisionalNoc' : 'noc'
    const nocEndDate = dateToString(applicationInfo.nocEndDate as Date, 'DDD')

    const generalSubtitle = t(`todos.${prefix}.general`, NOC_TRANSLATION_PROPS)
    const hostSubtitle = isHost ? t(`todos.${prefix}.host`, NOC_TRANSLATION_PROPS) : ''

    todos.push({
      id: isProvisional ? 'todo-provisional-noc-add-docs' : 'todo-noc-add-docs',
      title: `${t(`todos.${prefix}.title1`)} ${nocEndDate} ${t(`todos.${prefix}.title2`)}`,
      subtitle: `${generalSubtitle}${hostSubtitle}`,
      badge: isExpired ? t('label.expired') : undefined,
      badgeColor: isExpired ? 'red' : undefined
    })
  }

  return todos
}

export const getTodoRegistration = async (regId: number) => {
  const { getRegistrationToDos } = useStrrApi()
  const { todos } = await getRegistrationToDos(regId)

  // Single-pass Map indexing for O(N) lookup efficiency
  const tasksByType = new Map<RegistrationTodoType, ApiRegistrationTodoTaskResp>()
  for (const todo of todos) {
    const taskType = todo?.task?.type
    if (taskType && !tasksByType.has(taskType)) {
      tasksByType.set(taskType, todo)
    }
  }

  const renewalDraftTask = tasksByType.get(RegistrationTodoType.REGISTRATION_RENEWAL_DRAFT)?.task
  const renewalPaymentTask = tasksByType.get(RegistrationTodoType.REGISTRATION_RENEWAL_PAYMENT_PENDING)?.task

  return {
    hasRenewalTodo: tasksByType.has(RegistrationTodoType.REGISTRATION_RENEWAL),
    hasRenewalDraft: !!renewalDraftTask,
    hasRenewalPaymentPending: !!renewalPaymentTask,
    renewalDraftId: renewalDraftTask?.detail ?? null,
    renewalPaymentPendingId: renewalPaymentTask?.detail ?? null
  }
}

// Get information for Renewal Todo: due date, overdue status, etc.
export const getTodoRenewalInfo = (expiryDate: Date | string): {
  isOverdue: boolean
  renewalDueDate: string
  countdownLabel: string
} => {
  const { t } = useNuxtApp().$i18n

  const expDate = toVancouverDateTime(expiryDate)
  const today = DateTime.now().setZone('America/Vancouver')

  // convert expiry date to medium format date, eg Apr 1, 2025
  const renewalDueDate = expDate.toLocaleString(DateTime.DATE_MED)
  const daysToRenew = Math.floor(expDate.diff(today, 'days').toObject().days!)
  const isOverdue = daysToRenew < 0

  const countdownLabel = isOverdue
    ? t('label.renewalOverdue')
    : t('label.renewalDayCount', daysToRenew)

  return {
    isOverdue,
    renewalDueDate,
    countdownLabel
  }
}

// Check if renewal period is closed (3 years past expiry date for expired registrations)
export function isRenewalPeriodClosed (registration: ApiRegistrationResp): boolean {
  const { status, expiryDate } = registration

  if (status !== RegistrationStatus.EXPIRED) {
    return false
  }

  const expDate = toVancouverDateTime(expiryDate)
  const today = DateTime.now().setZone('America/Vancouver')
  return today.diff(expDate, 'years').years > RENEWAL_CLOSED_THRESHOLD_YEARS
}
