type FilingHistoryRecord = {
  id?: number
  header?: {
    applicationNumber?: string
    applications?: Array<{ applicationNumber?: string }>
  }
}

// Maps structured-details field paths returned by the API to filing history i18n keys.
export const FILING_HISTORY_FIELD_MAP: Record<string, string> = {
  'primaryContact.emailAddress': 'filingHistoryFields.primaryContactEmail'
}

const HIDDEN_EVENTS: Set<FilingHistoryEventName> = new Set([
  FilingHistoryEventName.AUTO_APPROVAL_FULL_REVIEW,
  FilingHistoryEventName.AUTO_APPROVAL_PROVISIONAL,
  FilingHistoryEventName.AUTO_APPROVAL_APPROVED
])

const EXPANDABLE_EVENTS: Set<FilingHistoryEventName> = new Set([
  FilingHistoryEventName.CONDITIONS_OF_APPROVAL_UPDATED,
  FilingHistoryEventName.REGISTRATION_UPDATED
])

const stringifyChangeValue = (value: unknown, translate: (key: string) => string): string => {
  if (value === null || value === undefined || value === '') {
    return translate('filingHistoryChangeLog.noValue')
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  try {
    return JSON.stringify(value)
  } catch {
    if (Array.isArray(value)) {
      return translate('filingHistoryChangeLog.unavailableValue')
    }

    if (typeof value === 'object') {
      return translate('filingHistoryChangeLog.unavailableValue')
    }

    return String(value)
  }
}

const resolveFieldLabel = (fieldPath: string, translate: (key: string) => string): string => {
  const i18nKey = FILING_HISTORY_FIELD_MAP[fieldPath]
  return i18nKey ? translate(i18nKey) : fieldPath
}

export const formatFilingHistoryChange = (
  fieldPath: string,
  oldValue: unknown,
  newValue: unknown,
  translate: (key: string, params?: Record<string, string>) => string
): string => {
  const field = resolveFieldLabel(fieldPath, translate)
  const hasOld = oldValue !== null && oldValue !== undefined && oldValue !== ''
  const hasNew = newValue !== null && newValue !== undefined && newValue !== ''

  if (hasOld || hasNew) {
    return translate('filingHistoryChangeLog.template', {
      field,
      old: stringifyChangeValue(oldValue, translate),
      new: stringifyChangeValue(newValue, translate)
    })
  }

  return translate('filingHistoryChangeLog.fallbackTemplate', { field })
}

const getRegistrationUpdateChanges = (
  event: FilingHistoryEvent,
  translate: (key: string, params?: Record<string, string>) => string
): string[] => {
  if (!event.structuredDetails || Array.isArray(event.structuredDetails)) {
    return []
  }

  const structured = event.structuredDetails as {
    changes?: Array<{ field?: string, oldValue?: unknown, newValue?: unknown }>
  }

  if (!Array.isArray(structured.changes)) {
    return []
  }

  return structured.changes.map((change) => {
    return formatFilingHistoryChange(
      change.field || translate('label.unknownField'),
      change.oldValue,
      change.newValue,
      translate
    )
  })
}

export const sortAndFilterFilingHistory = (events: FilingHistoryEvent[]): FilingHistoryEvent[] => {
  return [...events]
    .sort((a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime())
    .filter(event => !HIDDEN_EVENTS.has(event.eventName))
    .reverse()
}

export const buildFilingHistory = async (
  isApplication: boolean,
  activeRecord: FilingHistoryRecord | null | undefined,
  getApplicationFilingHistory: (applicationNumber: string) => Promise<FilingHistoryEvent[]>,
  getRegistrationFilingHistory: (registrationId: number) => Promise<FilingHistoryEvent[]>
): Promise<FilingHistoryEvent[]> => {
  if (!activeRecord) {
    return []
  }

  if (isApplication) {
    const applicationNumber = activeRecord.header?.applicationNumber
    return applicationNumber ? await getApplicationFilingHistory(applicationNumber) : []
  }

  const registrationId = activeRecord.id
  if (registrationId === undefined) {
    return []
  }

  const applicationNumber = activeRecord.header?.applications?.[0]?.applicationNumber
  const [applicationHistory, registrationHistory] = await Promise.all([
    applicationNumber ? getApplicationFilingHistory(applicationNumber) : Promise.resolve([]),
    getRegistrationFilingHistory(registrationId)
  ])

  const registrationCreatedEvent = FilingHistoryEventName.REGISTRATION_CREATED
  const hasDuplicatedRegistrationCreatedEvent =
    applicationHistory.some(event => event.eventName === registrationCreatedEvent) &&
    registrationHistory.some(event => event.eventName === registrationCreatedEvent)

  if (!hasDuplicatedRegistrationCreatedEvent) {
    return [...applicationHistory, ...registrationHistory]
  }

  return [
    ...applicationHistory.filter(event => event.eventName !== registrationCreatedEvent),
    ...registrationHistory
  ]
}

export const getFilingHistoryAccordionContent = (
  event: FilingHistoryEvent,
  translate: (key: string, params?: Record<string, string>) => string
): string => {
  if (event.eventName === FilingHistoryEventName.CONDITIONS_OF_APPROVAL_UPDATED) {
    return event.details || translate('label.noApprovalConditions')
  }

  if (event.eventName === FilingHistoryEventName.REGISTRATION_UPDATED) {
    const changes = getRegistrationUpdateChanges(event, translate)
    if (changes.length > 0) {
      return changes.join('\n\n')
    }

    return event.details || translate('label.noRegistrationUpdateDetails')
  }

  return ''
}

export const shouldRenderFilingHistoryAccordion = (event: FilingHistoryEvent): boolean => {
  return EXPANDABLE_EVENTS.has(event.eventName)
}

export const isEmptyFilingHistoryAccordion = (
  event: FilingHistoryEvent,
  translate: (key: string, params?: Record<string, string>) => string
): boolean => {
  if (event.eventName === FilingHistoryEventName.CONDITIONS_OF_APPROVAL_UPDATED) {
    return !event.details
  }

  if (event.eventName === FilingHistoryEventName.REGISTRATION_UPDATED) {
    return getRegistrationUpdateChanges(event, translate).length === 0 && !event.details
  }

  return false
}

export const useFilingHistory = async () => {
  const { t } = useI18n()
  const { getApplicationFilingHistory, getRegistrationFilingHistory } = useExaminerStore()
  const { isApplication, activeRecord } = storeToRefs(useExaminerStore())

  const historyTableColumns = [
    { key: 'createdDate', width: 200 },
    { key: 'message' }
  ]

  const record = activeRecord.value as FilingHistoryRecord | null | undefined

  let cacheKey: string
  if (record) {
    cacheKey = isApplication.value
      ? `filing-history-application-${record.header?.applicationNumber || 'unknown'}`
      : `filing-history-registration-${record.id ?? 'unknown'}`
  } else {
    cacheKey = 'filing-history-empty'
  }

  const { data: filingHistory, status } = await useLazyAsyncData<FilingHistoryEvent[]>(
    cacheKey,
    async () => {
      const allFilingHistory = await buildFilingHistory(
        isApplication.value,
        activeRecord.value as FilingHistoryRecord,
        getApplicationFilingHistory,
        getRegistrationFilingHistory
      )

      return sortAndFilterFilingHistory(allFilingHistory)
    },
    { default: () => [] }
  )

  return {
    filingHistory,
    status,
    historyTableColumns,
    shouldRenderFilingHistoryAccordion,
    getFilingHistoryAccordionContent,
    isEmptyFilingHistoryAccordion,
    t
  }
}
