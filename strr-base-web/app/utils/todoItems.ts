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

const createBeginAppTodo = (t: Function, localePath: Function, applicationPath: string): Todo => ({
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

const createResumeAppTodo = (
  t: Function,
  localePath: Function,
  applicationPath: string,
  applicationInfo: ApplicationHeader
): Todo => ({
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

const createPaymentTodo = (t: Function, payRedirectPath: string, applicationInfo: ApplicationHeader): Todo => {
  const { handlePaymentRedirect } = useConnectNav()
  return {
    id: 'todo-complete-payment',
    title: t('label.completePayment'),
    subtitle: undefined,
    buttons: [{
      label: t('label.payNow'),
      action: () => handlePaymentRedirect(applicationInfo.paymentToken, payRedirectPath)
    }]
  }
}

const createNocTodoItem = (
  t: Function,
  applicationInfo: ApplicationHeader,
  applicationType?: ApplicationType
): Todo | null => {
  const status = applicationInfo.status
  if (!status || !NOC_STATUSES.has(status) || !applicationInfo.nocEndDate) {
    return null
  }

  const isProvisional = PROVISIONAL_NOC_STATUSES.has(status)
  const isExpired = EXPIRED_NOC_STATUSES.has(status)
  const isHost = applicationType === ApplicationType.HOST
  const prefix = isProvisional ? 'provisionalNoc' : 'noc'
  const nocEndDate = dateToString(applicationInfo.nocEndDate as Date, 'DDD')

  const title1 = t('todos.' + prefix + '.title1')
  const title2 = t('todos.' + prefix + '.title2')
  const generalSubtitle = t('todos.' + prefix + '.general', NOC_TRANSLATION_PROPS)
  const hostSubtitle = isHost ? t('todos.' + prefix + '.host', NOC_TRANSLATION_PROPS) : ''

  return {
    id: isProvisional ? 'todo-provisional-noc-add-docs' : 'todo-noc-add-docs',
    title: `${title1} ${nocEndDate} ${title2}`,
    subtitle: `${generalSubtitle}${hostSubtitle}`,
    badge: isExpired ? t('label.expired') : undefined,
    badgeColor: isExpired ? 'red' : undefined
  }
}

export const getTodoApplication = (
  applicationPath: string,
  payRedirectPath: string,
  applicationInfo?: ApplicationHeader,
  applicationType?: ApplicationType
): Todo[] => {
  const { t } = useNuxtApp().$i18n
  const localePath = useLocalePath()

  if (!applicationInfo) {
    return [createBeginAppTodo(t, localePath, applicationPath)]
  }

  const isRenewal = applicationInfo.applicationType === 'renewal'

  if (applicationInfo.status === ApplicationStatus.DRAFT && !isRenewal) {
    return [createResumeAppTodo(t, localePath, applicationPath, applicationInfo)]
  }

  if (applicationInfo.hostActions?.includes(HostActions.SUBMIT_PAYMENT) && !isRenewal) {
    return [createPaymentTodo(t, payRedirectPath, applicationInfo)]
  }

  const nocTodo = createNocTodoItem(t, applicationInfo, applicationType)
  return nocTodo ? [nocTodo] : []
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
