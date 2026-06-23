export interface FilingHistoryEvent {
  createdDate: string
  eventName: FilingHistoryEventName
  eventType: string
  idir: string | null
  message: string
  details: string | null
  structuredDetails: Record<string, unknown[]> | unknown[] | null
}
