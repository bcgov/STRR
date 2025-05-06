export interface FilingHistoryEvent {
  createdDate: string
  eventName: FilingHistoryEventName
  eventType: string
  idir: string | null
  message: string
}
