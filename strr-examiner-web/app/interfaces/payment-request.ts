export interface PaymentInvoiceLineItem {
  description: string
  filingFees: number
  futureEffectiveFees: number
  gst: number
  id: number
  priorityFees: number
  pst: number
  quantity: number
  serviceFees: number
  statusCode: string
  total: number
  waivedBy: string | null
  waivedFees: number
}

export interface PaymentInvoiceReceipt {
  id: number
  receiptAmount: number
  receiptDate: string
  receiptNumber: string
}

export interface PaymentInvoiceReference {
  createdOn: string
  id: number
  invoiceNumber: string
  statusCode: string
}

export interface PaymentInvoice {
  corpTypeCode: string
  createdBy: string
  createdName: string
  createdOn: string
  folioNumber: string
  id: number
  isPaymentActionRequired: boolean
  lineItems: PaymentInvoiceLineItem[]
  overdueDate: string
  paid: number
  paymentAccount: {
    accountId: string
    accountName: string
    billable: boolean
  }
  paymentDate: string
  paymentMethod: string
  receipts: PaymentInvoiceReceipt[]
  references: PaymentInvoiceReference[]
  refund: number
  serviceFees: number
  statusCode: string
  total: number
  updatedBy: string
  updatedName: string
  updatedOn: string
}
