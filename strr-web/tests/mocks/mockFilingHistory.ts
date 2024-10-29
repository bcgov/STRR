export const mockFilingHistory: FilingHistoryEventI[] = [
  {
    createdDate: '2024-08-14T22:24:42.006030+00:00',
    eventName: 'APPLICATION_SUBMITTED',
    eventType: 'APPLICATION',
    message: 'Application submitted.'
  },
  {
    createdDate: '2024-08-15T10:30:00.000000+00:00',
    eventName: 'INVOICE_GENERATED',
    eventType: 'APPLICATION',
    message: 'Invoice generated.'
  },
  {
    createdDate: '2024-08-15T11:15:00.000000+00:00',
    eventName: 'PAYMENT_COMPLETE',
    eventType: 'APPLICATION',
    message: 'Payment completed.'
  },
  {
    createdDate: '2024-08-15T11:20:00.000000+00:00',
    eventName: 'PENDING_AUTO_APPROVAL_PROCESSING',
    eventType: 'APPLICATION',
    message: 'Pending Auto Approval processing.'
  },
  {
    createdDate: '2024-08-16T11:08:40.948148+00:00',
    eventName: 'AUTO_APPROVAL_APPROVED',
    eventType: 'APPLICATION',
    message: 'Application approved by the auto approval process.'
  },
  {
    createdDate: '2024-08-16T11:08:40.935161+00:00',
    eventName: 'REGISTRATION_CREATED',
    eventType: 'REGISTRATION',
    message: 'Registration created.'
  },
  {
    createdDate: '2024-08-16T11:10:00.000000+00:00',
    eventName: 'CERTIFICATE_ISSUED',
    eventType: 'REGISTRATION',
    message: 'Certificate issued for the registration.'
  }
]
